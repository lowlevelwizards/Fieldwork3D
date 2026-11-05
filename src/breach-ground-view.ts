/** Cheap conservative FOV rejection before expensive wall/door/cover LOS.
 * Matches the 240-unit, +/-1.15 radian intel exploration cone.
 * Only candidate selection changes; actual occlusion remains authoritative.
 */
export type GroundView={x:number;y:number;forwardX:number;forwardY:number};
const RADIUS_SQUARED=240*240;
const MIN_DOT_SQUARED=Math.cos(1.15)**2;
export function groundView(x:number,y:number,heading:number):GroundView{
  return {x,y,forwardX:Math.cos(heading),forwardY:Math.sin(heading)};
}
export function groundViewCandidate(view:GroundView,x:number,y:number):boolean{
  const dx=x-view.x,dy=y-view.y,distSquared=dx*dx+dy*dy;
  if(distSquared>=RADIUS_SQUARED)return false;
  if(distSquared===0)return true;
  const dot=dx*view.forwardX+dy*view.forwardY;
  return dot>0&&dot*dot>distSquared*MIN_DOT_SQUARED;
}
