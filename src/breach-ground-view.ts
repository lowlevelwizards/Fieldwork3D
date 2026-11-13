/** Cheap conservative FOV rejection before expensive wall/door/cover LOS.
 * Preserves the 1.15 radian cone with a configurable map-bounded radius.
 * Only candidate selection changes; actual occlusion remains authoritative.
 */
export type GroundView={x:number;y:number;forwardX:number;forwardY:number;radius:number};
const MIN_DOT_SQUARED=Math.cos(1.15)**2;
export function groundView(x:number,y:number,heading:number,radius=240):GroundView{
  return {x,y,forwardX:Math.cos(heading),forwardY:Math.sin(heading),radius};
}
export function groundViewCandidate(view:GroundView,x:number,y:number):boolean{
  const dx=x-view.x,dy=y-view.y,distSquared=dx*dx+dy*dy;
  const radiusSquared=view.radius*view.radius;
  // A point constructed on the exact radius can round to a slightly
  // smaller squared distance while Math.hypot still returns exactly 240.
  // Fall back to the original strict radial test *only* at that numerical
  // boundary so neither gameplay sight nor terrain memory leaks a sliver.
  if(Math.abs(distSquared-radiusSquared)<1e-7){
    if(Math.hypot(dx,dy)>=view.radius)return false;
  }else if(distSquared>=radiusSquared)return false;
  // atan2(0,0) historically points east; keep that rare exact-center
  // behavior so the optimization never reveals a previously blind tile.
  if(distSquared===0)return view.forwardX>0&&
    view.forwardX*view.forwardX>MIN_DOT_SQUARED;
  const dot=dx*view.forwardX+dy*view.forwardY;
  return dot>0&&dot*dot>distSquared*MIN_DOT_SQUARED;
}
