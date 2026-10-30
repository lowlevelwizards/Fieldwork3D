/** A 2.5D ray-versus-cover test. Wall and door authority remain planar,
 * but low and high furniture only stop the shot when it intersects their
 * actual physical height. The target posture changes the aim height. */
import type {Pt,Obstacle} from './breach-core.ts';
export const coverHeight=(c:Obstacle)=>c.low?12:27;
export const eyeHeight=(crouched:boolean)=>crouched?15:32;
export const aimHeight=(crouched:boolean)=>crouched?11:32;
export function coverImpactFraction(from:Pt,to:Pt,fromZ:number,toZ:number,
  c:Obstacle):number|null{
  let lo=0,hi=1;
  const dx=to.x-from.x,dy=to.y-from.y;
  for(const [origin,delta,min,max] of [
    [from.x,dx,c.x-c.w/2,c.x+c.w/2],
    [from.y,dy,c.y-c.h/2,c.y+c.h/2],
  ]){
    if(Math.abs(delta)<1e-7){
      if(origin<min||origin>max)return null;
      continue;
    }
    let t0=(min-origin)/delta,t1=(max-origin)/delta;
    if(t0>t1){const swap=t0;t0=t1;t1=swap;}
    lo=Math.max(lo,t0);hi=Math.min(hi,t1);
    if(lo>hi)return null;
  }
  if(hi<0||lo>1)return null;
  const height=coverHeight(c);
  const atLo=fromZ+(toZ-fromZ)*lo;
  if(atLo<=height)return lo;
  // A descending trajectory may enter above cover and hit inside it.
  const atHi=fromZ+(toZ-fromZ)*hi;
  if(atHi>height||toZ>=fromZ)return null;
  return Math.max(lo,Math.min(hi,
    (height-fromZ)/(toZ-fromZ)));
}
