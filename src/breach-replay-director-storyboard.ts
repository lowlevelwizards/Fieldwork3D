/** A replay camera is a film-time program, not a reactive spectator.
 * Pose knots are solved from the finished recording on a bounded lazy
 * timeline. The same timestamp always produces the same composition no
 * matter the direction, speed, seek history or frame rate of playback.
 */
import type {DirectorShot} from './breach-replay-director-shots.ts';
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const angleDelta=(next:number,from:number)=>
  Math.atan2(Math.sin(next-from),Math.cos(next-from));
const smooth=(n:number)=>n*n*(3-2*n);
export class ReplayDirectorStoryboard{
  private cache=new Map<number,DirectorShot|null>();
  private readonly step:number;
  private readonly maxCache:number;
  private readonly duration:number;
  private readonly solve:(time:number)=>DirectorShot|null;
  constructor(duration:number,solve:(time:number)=>DirectorShot|null,
    options:{step?:number;maxCache?:number}={}){
    this.duration=duration;this.solve=solve;
    this.step=options.step??.8;
    this.maxCache=options.maxCache??96;
  }
  clear():void{this.cache.clear();}
  get cachedKnots():number{return this.cache.size;}
  private key(index:number):DirectorShot|null{
    const i=Math.max(0,Math.min(Math.ceil(this.duration/this.step),index));
    const known=this.cache.get(i);
    if(known!==undefined)return known;
    const pose=this.solve(Math.min(this.duration,i*this.step));
    this.cache.set(i,pose);
    if(this.cache.size>this.maxCache)
      this.cache.delete(this.cache.keys().next().value!);
    return pose;
  }
  sample(time:number):DirectorShot|null{
    const t=clamp(time,0,this.duration);
    const key=t/this.step,index=Math.floor(key);
    const from=this.key(index),to=this.key(index+1);
    if(!from)return to;
    if(!to)return from;
    const p=smooth(clamp(key-index,0,1));
    const mix=(a:number,b:number)=>a+(b-a)*p;
    const sameRoom=from.roomId===to.roomId;
    // Crossing an architectural boundary is a deliberate camera cut,
    // never a slide of the camera through an opaque wall. The two
    // compositions on either side are already calculated in the film.
    const cameraAnchor=sameRoom?{
      x:mix(from.cameraAnchor.x,to.cameraAnchor.x),
      y:mix(from.cameraAnchor.y,to.cameraAnchor.y)
    }:p<.5?from.cameraAnchor:to.cameraAnchor;
    const metadata=p<.5?from:to;
    return {...metadata,
      focus:{x:mix(from.focus.x,to.focus.x),
        y:mix(from.focus.y,to.focus.y)},
      zoom:mix(from.zoom,to.zoom),
      yaw:(from.yaw+angleDelta(to.yaw,from.yaw)*p+
        2*Math.PI)%(2*Math.PI),
      pitch:mix(from.pitch,to.pitch),
      cameraAnchor
    };
  }
}
