/** A finished replay is a film, not a reactive orbit camera.
 * Chronological, repeatable camera poses hold a side through a gunfight,
 * suppress small heading corrections and rotate only at a leisurely rate.
 * A seek reconstructs the same planned pose from fixed checkpoints.
 */
import type {DirectorShot} from './breach-replay-director-shots.ts';
import type {DirectorRoom} from './breach-replay-cinematic-director.ts';
import {directorCameraLegal,directorLineBlocked}
  from './breach-replay-director-physical.ts';
import type {PhysicalDirectorScene} from './breach-replay-director-physical.ts';

type Pt={x:number;y:number};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const angleDelta=(next:number,from:number)=>
  Math.atan2(Math.sin(next-from),Math.cos(next-from));
const smooth=(n:number)=>n*n*(3-2*n);
const cutAngle=65*Math.PI/180;
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);

export class ReplayDirectorStoryboard{
  private cache=new Map<number,DirectorShot|null>();
  private checkpoints=new Map<number,DirectorShot|null>();
  private rawCache=new Map<number,DirectorShot|null>();
  private readonly step:number;
  private readonly maxCache:number;
  private readonly rooms:readonly DirectorRoom[];
  private readonly physicalScene:PhysicalDirectorScene;
  private readonly duration:number;
  private readonly solve:(time:number)=>DirectorShot|null;
  constructor(duration:number,solve:(time:number)=>DirectorShot|null,
    options:{step?:number;maxCache?:number;rooms?:readonly DirectorRoom[];
      walls?:PhysicalDirectorScene['walls'];
      cover?:PhysicalDirectorScene['cover'];
      doors?:PhysicalDirectorScene['doors']}={}){
    this.duration=duration;this.solve=solve;
    this.step=Math.max(.2,options.step??.8);
    this.maxCache=Math.max(4,options.maxCache??96);
    this.rooms=options.rooms??[];
    this.physicalScene={rooms:this.rooms,walls:options.walls??[],
      cover:options.cover,doors:options.doors};
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
      // A single sample at a doorway must not move the physical rig to
      // another room. A real entry uses a deliberate whole-camera cut.
      const next=this.raw(index+1);
      if(next&&next.roomId!==raw.roomId)return prior;
      return raw;
    }
    const sameBeat=!!raw.beatId&&raw.beatId===prior.beatId;
    const startingBeat=!!raw.beatId&&raw.beatId!==prior.beatId;
    const turn=angleDelta(raw.yaw,prior.yaw);
    // Establish a completely new breach or gunfight with a deliberate
    // camera cut; never whip through that angle over .8 seconds.
    if(startingBeat&&Math.abs(turn)>cutAngle)return raw;
    const room=this.rooms.find(r=>r.id===raw.roomId)??null;
    const actor=raw.operatorPoint??raw.focus;
    const stillPossible=directorCameraLegal(
      prior.cameraAnchor,room,this.physicalScene)&&
      distance(prior.cameraAnchor,actor)<96&&
      !directorLineBlocked(prior.cameraAnchor,actor,this.physicalScene);
    let cameraAnchor=raw.cameraAnchor;
    if(stillPossible){
      // A camera operator walks with a team instead of orbiting the
      // actors. One continuous fight is one locked tripod until the
      // participants truly leave the available shooting position.
      if(sameBeat)cameraAnchor=prior.cameraAnchor;
      else {
        const d=distance(prior.cameraAnchor,raw.cameraAnchor);
        const t=d>0?Math.min(1,11/d):1;
        const proposed={x:prior.cameraAnchor.x+
          (raw.cameraAnchor.x-prior.cameraAnchor.x)*t,
          y:prior.cameraAnchor.y+
          (raw.cameraAnchor.y-prior.cameraAnchor.y)*t};
        if(directorCameraLegal(proposed,room,this.physicalScene)&&
           !directorLineBlocked(proposed,actor,this.physicalScene))
          cameraAnchor=proposed;
      }
    }
    const focusFactor=sameBeat?.42:startingBeat?.65:.30;
    let focus={x:prior.focus.x+
      (raw.focus.x-prior.focus.x)*focusFactor,
      y:prior.focus.y+(raw.focus.y-prior.focus.y)*focusFactor};
    if(directorLineBlocked(cameraAnchor,focus,this.physicalScene))
      focus=!directorLineBlocked(cameraAnchor,raw.focus,
        this.physicalScene)?raw.focus:actor;
    const yaw=(Math.atan2(cameraAnchor.x-focus.x,
      cameraAnchor.y-focus.y)+4*Math.PI)%(2*Math.PI);
    const oldFov=prior.fov??76,newFov=raw.fov??76;
    const fov=newFov>oldFov?newFov:
      oldFov+(newFov-oldFov)*.30;
    return {...raw,focus,cameraAnchor,yaw,
      // Keep the action visible while a physical camera repositions.
      fov:clamp(fov+(!stillPossible?5:0),66,105),
      pitch:prior.pitch+(raw.pitch-prior.pitch)*.25,
      zoom:raw.zoom<prior.zoom?raw.zoom:
        prior.zoom+(raw.zoom-prior.zoom)*.28};
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
    const room=this.rooms.find(r=>r.id===from.roomId)??null;
    const midpoint={x:(from.cameraAnchor.x+to.cameraAnchor.x)*.5,
      y:(from.cameraAnchor.y+to.cameraAnchor.y)*.5};
    const physicallyConnected=directorCameraLegal(midpoint,room,
      this.physicalScene)&&
      !directorLineBlocked(from.cameraAnchor,to.cameraAnchor,
        this.physicalScene,false);
    if(!sameRoom||flip||!physicallyConnected){
      // No fly-through walls, fixtures or ceilings. A shot transition
      // with no walkable camera path is a planned EDIT, not a dolly.
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
      fov:mix(from.fov??76,to.fov??76),
      cameraAnchor:{
        x:mix(from.cameraAnchor.x,to.cameraAnchor.x),
        y:mix(from.cameraAnchor.y,to.cameraAnchor.y)}
    };
  }
}
