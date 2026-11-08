/** A finished replay is a film, not a reactive orbit camera.
 * Chronological, repeatable camera poses hold a side through a gunfight,
 * suppress small heading corrections and rotate only at a leisurely rate.
 * A seek reconstructs the same planned pose from fixed checkpoints.
 */
import type {DirectorShot} from './breach-replay-director-shots.ts';
import type {DirectorRoom} from './breach-replay-cinematic-director.ts';

type Pt={x:number;y:number};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const angleDelta=(next:number,from:number)=>
  Math.atan2(Math.sin(next-from),Math.cos(next-from));
const smooth=(n:number)=>n*n*(3-2*n);
const cutAngle=65*Math.PI/180;
const quietAngle=26*Math.PI/180;
const cameraRadius=53;

/** Keep the true, low replay camera in the occupied room on the
 * PLANNED side of the focus, not whichever side a framewise solver
 * happens to favor. A ray from an exterior action focus can still
 * enter the room and sit over the friendly shooter's shoulder.
 */
function anchorOnSide(focus:Pt,yaw:number,
  room:DirectorRoom|null):Pt|null{
  const ray={x:Math.sin(yaw),y:Math.cos(yaw)};
  if(!room)return {x:focus.x+ray.x*cameraRadius,
    y:focus.y+ray.y*cameraRadius};
  const inset=Math.min(7,room.w*.18,room.h*.18);
  let enter=0,leave=Infinity;
  for(const [p,d,min,max] of [
    [focus.x,ray.x,room.x+inset,room.x+room.w-inset],
    [focus.y,ray.y,room.y+inset,room.y+room.h-inset]
  ] as const){
    if(Math.abs(d)<.0001){
      if(p<min||p>max)return null;
      continue;
    }
    const a=(min-p)/d,b=(max-p)/d;
    enter=Math.max(enter,Math.min(a,b));
    leave=Math.min(leave,Math.max(a,b));
  }
  if(leave<=enter+.01)return null;
  const margin=Math.min(5,(leave-enter)*.2);
  const radius=clamp(cameraRadius,enter+margin,leave-margin);
  return {x:focus.x+ray.x*radius,y:focus.y+ray.y*radius};
}
export class ReplayDirectorStoryboard{
  private cache=new Map<number,DirectorShot|null>();
  private checkpoints=new Map<number,DirectorShot|null>();
  private rawCache=new Map<number,DirectorShot|null>();
  private readonly step:number;
  private readonly maxCache:number;
  private readonly rooms:readonly DirectorRoom[];
  private readonly duration:number;
  private readonly solve:(time:number)=>DirectorShot|null;
  constructor(duration:number,solve:(time:number)=>DirectorShot|null,
    options:{step?:number;maxCache?:number;rooms?:readonly DirectorRoom[]}={}){
    this.duration=duration;this.solve=solve;
    this.step=Math.max(.2,options.step??.8);
    this.maxCache=Math.max(4,options.maxCache??96);
    this.rooms=options.rooms??[];
  }
  clear():void{
    this.cache.clear();this.checkpoints.clear();this.rawCache.clear();
  }
  get cachedKnots():number{return this.cache.size;}
  private raw(index:number):DirectorShot|null{
    const i=Math.max(0,Math.min(Math.ceil(this.duration/this.step),index));
    if(this.rawCache.has(i))return this.rawCache.get(i)!;
    const result=this.solve(Math.min(this.duration,i*this.step));
    this.rawCache.set(i,result);
    while(this.rawCache.size>this.maxCache)
      this.rawCache.delete(this.rawCache.keys().next().value!);
    return result;
  }
  private plan(raw:DirectorShot|null,prior:DirectorShot|null,
    index:number):DirectorShot|null{
    if(!raw||!prior)return raw;
    const sameRoom=raw.roomId===prior.roomId;
    if(!sameRoom){
      // Ignore a one-knot threshold wobble. A real room transition
      // must persist into the next recorded moment before cutting.
      const next=this.raw(index+1);
      if(next&&next.roomId!==raw.roomId)return prior;
      return raw;
    }
    const turn=angleDelta(raw.yaw,prior.yaw);
    const abs=Math.abs(turn);
    const sameBeat=!!raw.beatId&&raw.beatId===prior.beatId;
    const startingBeat=!!raw.beatId&&raw.beatId!==prior.beatId;
    // The only large same-room angle jump allowed is ONE deliberate
    // establishing cut at the start of a recorded firefight/breach.
    if(startingBeat&&abs>cutAngle)return raw;
    let yaw=prior.yaw;
    if(!sameBeat&&abs>quietAngle){
      const maximum=(startingBeat?13:7)*Math.PI/180;
      yaw+=Math.sign(turn)*Math.min(maximum,abs-quietAngle);
    }
    yaw=(yaw+4*Math.PI)%(2*Math.PI);
    const room=this.rooms.find(r=>r.id===raw.roomId)??null;
    // Keep camera on the same side while operators advance through
    // the room; do not interpolate between opposite imaginary orbits.
    const cameraAnchor=this.rooms.length?
      (anchorOnSide(raw.focus,yaw,room)??prior.cameraAnchor):
      raw.cameraAnchor;
    // Pan with actors without responding to every tiny body/head turn.
    // Pull out for action coverage immediately; creep closer afterwards.
    const focus=raw.beatId?
      {x:prior.focus.x+(raw.focus.x-prior.focus.x)*.8,
        y:prior.focus.y+(raw.focus.y-prior.focus.y)*.8}:
      {x:prior.focus.x+(raw.focus.x-prior.focus.x)*.7,
        y:prior.focus.y+(raw.focus.y-prior.focus.y)*.7};
    const keptAnchor=this.rooms.length?
      (anchorOnSide(focus,yaw,room)??cameraAnchor):cameraAnchor;
    const zoom=raw.zoom<prior.zoom?
      raw.zoom:prior.zoom+(raw.zoom-prior.zoom)*.32;
    const conservativeZoom=abs>quietAngle?zoom*.89:zoom;
    return {...raw,focus,cameraAnchor:keptAnchor,yaw,
      zoom:conservativeZoom,
      pitch:prior.pitch+(raw.pitch-prior.pitch)*.3};
  }
  private remember(index:number,shot:DirectorShot|null):void{
    this.cache.set(index,shot);
    while(this.cache.size>this.maxCache)
      this.cache.delete(this.cache.keys().next().value!);
    if(index%24===0)this.checkpoints.set(index,shot);
  }
  /** Plan sequentially from the closest fixed checkpoint. No result
   * depends on the order in which the viewer scrubs or rewinds. */
  private key(index:number):DirectorShot|null{
    const i=Math.max(0,Math.min(Math.ceil(this.duration/this.step),index));
    if(this.cache.has(i))return this.cache.get(i)!;
    let start=0,prior:DirectorShot|null=null;
    for(const [j,shot] of this.checkpoints){
      if(j<i&&j>=start){start=j+1;prior=shot;}
    }
    for(const [j,shot] of this.cache){
      if(j<i&&j>=start){start=j+1;prior=shot;}
    }
    for(let j=start;j<=i;j++){
      const planned=this.plan(this.raw(j),prior,j);
      this.remember(j,planned);
      prior=planned;
    }
    return prior;
  }
  sample(time:number):DirectorShot|null{
    const t=clamp(time,0,this.duration);
    const fraction=t/this.step,index=Math.floor(fraction);
    const from=this.key(index),to=this.key(index+1);
    if(!from)return to;
    if(!to)return from;
    const p=smooth(clamp(fraction-index,0,1));
    const sameRoom=from.roomId===to.roomId;
    const flip=from.beatId!==to.beatId&&
      Math.abs(angleDelta(to.yaw,from.yaw))>cutAngle;
    if(!sameRoom||flip){
      // A planned edit is a CUT, not a 180° orbit in .8 seconds.
      return p<.5?from:to;
    }
    const mix=(a:number,b:number)=>a+(b-a)*p;
    return {...(p<.5?from:to),
      focus:{x:mix(from.focus.x,to.focus.x),
        y:mix(from.focus.y,to.focus.y)},
      zoom:mix(from.zoom,to.zoom),
      yaw:(from.yaw+angleDelta(to.yaw,from.yaw)*p+
        2*Math.PI)%(2*Math.PI),
      pitch:mix(from.pitch,to.pitch),
      cameraAnchor:{
        x:mix(from.cameraAnchor.x,to.cameraAnchor.x),
        y:mix(from.cameraAnchor.y,to.cameraAnchor.y)}
    };
  }
}
