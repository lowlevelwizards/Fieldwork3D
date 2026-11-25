/** Protect the exact conservative footprint of the existing mobility
 * audit's door approach lattice: depth 52, lateral offsets 16, radius 8.
 * Reserve an axis-aligned superset on both sides so every possible audited
 * edge remains available, including for large fixtures whose CENTER passes
 * the old 68-unit exclusion. Offline generation only. */
import {OPERATOR_RADIUS,type Door,type Obstacle} from '../breach-core.ts';
export type ExteriorDoorReserve={x:number;y:number;w:number;h:number};
export function exteriorDoorReserves(doors:readonly Door[]):ExteriorDoorReserve[]{
 return doors.map(door=>{
  const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y,len=Math.hypot(dx,dy)||1;
  const tx=Math.abs(dx/len),ty=Math.abs(dy/len);
  const lateral=Math.max(16,len/2),depth=Math.max(52,len);
  const r=OPERATOR_RADIUS+1.25;
  return {x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2,
   w:2*(tx*lateral+ty*depth+r),h:2*(ty*lateral+tx*depth+r)};
 });
}
export function intersectsExteriorDoorReserve(
 reserves:readonly ExteriorDoorReserve[],candidate:Pick<Obstacle,'x'|'y'|'w'|'h'>
):boolean{
 return reserves.some(r=>Math.abs(r.x-candidate.x)<(r.w+candidate.w)/2&&
  Math.abs(r.y-candidate.y)<(r.h+candidate.h)/2);
}
