/** Exact, allocation-free 2D line segment vs axis-aligned rectangle.
 * Returns true for starting inside, grazing, or crossing the rectangle.
 * Used by visibility and cover queries; avoids per-ray grid samples. */
import type {Pt,Obstacle} from './breach-core.ts';
export function segmentHitsBox(a:Pt,b:Pt,box:Obstacle):boolean{
  const dx=b.x-a.x,dy=b.y-a.y;
  let enter=0,exit=1;
  const sides:[[number,number,number],[number,number,number]]=[
    [a.x,dx,box.x-box.w/2],[a.y,dy,box.y-box.h/2]];
  for(let axis=0;axis<2;axis++){
    const [origin,velocity,min]=sides[axis];
    const max=min+(axis===0?box.w:box.h);
    if(Math.abs(velocity)<1e-9){
      if(origin<min||origin>max)return false;
      continue;
    }
    let t0=(min-origin)/velocity,t1=(max-origin)/velocity;
    if(t0>t1){const swap=t0;t0=t1;t1=swap;}
    enter=Math.max(enter,t0);exit=Math.min(exit,t1);
    if(enter>exit)return false;
  }
  return exit>=0&&enter<=1;
}
