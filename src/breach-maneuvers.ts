/** Breach 063: deliberate, bounded corner-clearing arcs.
 * Arc geometry is always validated against the same collision walls as live movement.
 */
import {type Pt,type Door,WALLS,passable,segmentsCross,route,doorCenter} from './breach-core.ts';
import {length} from './breach-plan.ts';
export type PieSide='ccw'|'cw';
export const PIE_DEGREES=54;
export const PIE_STEPS=9;
const radians=PIE_DEGREES*Math.PI/180;
export const pieArc=(start:Pt,pivot:Pt,side:PieSide):Pt[]=>{
  const r=length(start,pivot);
  if(r<27||r>108)return [];
  const theta=Math.atan2(start.y-pivot.y,start.x-pivot.x);
  const sign=side==='cw'?1:-1;
  return Array.from({length:PIE_STEPS},(_,i)=>{
    const a=theta+sign*radians*(i+1)/PIE_STEPS;
    return {x:pivot.x+Math.cos(a)*r,y:pivot.y+Math.sin(a)*r};
  });
};
export function validPieArc(start:Pt,pivot:Pt,side:PieSide,doors:Door[]):Pt[]{
  const points=pieArc(start,pivot,side);
  if(!points.length||!passable(start))return [];
  let last=start;
  for(const p of points){
    if(!passable(p))return [];
    const path={a:last,b:p};
    if(WALLS.some(w=>segmentsCross(path,w)))return [];
    if(doors.some(door=>!door.open&&segmentsCross(path,door)))return [];
    // This also verifies the same motor's local A* traversal is available.
    if(!route(last,p).length)return [];
    last=p;
  }
  return points;
}
export function bestPieDoor(p:Pt,doors:Door[]):Door|null{
  return doors.filter(d=>length(p,doorCenter(d))<108)
    .sort((a,b)=>length(p,doorCenter(a))-length(p,doorCenter(b)))[0]??null;
}
