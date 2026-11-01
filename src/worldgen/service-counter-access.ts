/** Physical access audit for counter-based service spaces.
 * Customer and worker approach points must both be inside their actual room.
 * It does not invent new geometry or treat nearby furniture as passable.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Pt,Obstacle} from '../breach-core.ts';
export const SERVICE_COUNTERS=new Set([
 'reception-desk','transaction-counter','parts-counter'
]);
export type CounterAccess={
 fixture:string;x:number;y:number;
 customer:Pt;staff:Pt;customerClear:boolean;staffClear:boolean;
};
const inside=(r:Room,p:Pt)=>p.x>r.x+8&&p.y>r.y+8&&
 p.x<r.x+r.w-8&&p.y<r.y+r.h-8;
const blocked=(p:Pt,cover:readonly Obstacle[],self:Obstacle)=>
 cover.some(o=>o!==self&&Math.abs(o.x-p.x)<o.w/2+9&&
   Math.abs(o.y-p.y)<o.h/2+9);
const nearDoor=(p:Pt,site:Pick<Site,'doors'|'openings'>)=>
 site.doors.some(d=>Math.hypot(p.x-(d.a.x+d.b.x)/2,
   p.y-(d.a.y+d.b.y)/2)<22)||
 (site.openings??[]).some(d=>Math.hypot(p.x-(d.a.x+d.b.x)/2,
   p.y-(d.a.y+d.b.y)/2)<22);
/** Shared placement predicate: use the same front/back clearance rule
 * during orientation as the final Map Lab service-access audit. */
export function counterApproachFor(room:Room,counter:Obstacle,
 cover:readonly Obstacle[],site:Pick<Site,'doors'|'openings'>):CounterAccess{
 const face=([{x:0,y:1},{x:1,y:0},{x:0,y:-1},{x:-1,y:0}] as const)
  [((counter.orientation??0)%4+4)%4];
 const distance=(counter.orientation??0)%2===0?counter.h/2+17:
  counter.w/2+17;
 const customer={x:counter.x+face.x*distance,
  y:counter.y+face.y*distance};
 const staff={x:counter.x-face.x*distance,
  y:counter.y-face.y*distance};
 const clear=(p:Pt)=>inside(room,p)&&!blocked(p,cover,counter)&&
  !nearDoor(p,site);
 return {fixture:counter.fixture??'',x:counter.x,y:counter.y,
  customer,staff,customerClear:clear(customer),staffClear:clear(staff)};
}

export function inspectCounterAccess(
 site:Pick<Site,'rooms'|'cover'|'doors'|'openings'>):CounterAccess[]{
 const results:CounterAccess[]=[];
 for(const counter of site.cover){
  if(!SERVICE_COUNTERS.has(counter.fixture??''))continue;
  const room=site.rooms.find(r=>r.kind==='room'&&counter.x>r.x&&
   counter.x<r.x+r.w&&counter.y>r.y&&counter.y<r.y+r.h);
  if(!room)continue;
  results.push(counterApproachFor(room,counter,site.cover,site));
 }
 return results;
}
