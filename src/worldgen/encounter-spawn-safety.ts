/** Rules shared by interior placement, exterior lookouts, reachability fallback
 * and audits. The operator deployment area is never an ambush spawn zone. */
import type {Site,Room,ExteriorZone} from '../breach-site.ts';
import type {Pt} from '../breach-core.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export const INTERIOR_INSERTION_CLEARANCE=125;
export const EXTERIOR_INSERTION_CLEARANCE=195;
export function clearOfInsertion(site:Pick<Site,'spawn'|'entrance'|'extract'>,
 p:Pt,exterior=false):boolean{
 const margin=exterior?EXTERIOR_INSERTION_CLEARANCE:INTERIOR_INSERTION_CLEARANCE;
 return site.spawn.every(operator=>dist(operator,p)>=margin)&&
  dist(site.entrance,p)>=(exterior?185:115)&&
  dist(site.extract,p)>=(exterior?125:45);
}
/** Capacity is based on real free floor, not the number of underlying room cells.
 * A tiny furnished office cannot accommodate a four-person spawn stack. */
export function roomOccupancyCapacity(room:Room,cover:Site['cover']):number{
 const area=room.w*room.h;
 const occupied=cover.reduce((total,o)=>{
  const left=Math.max(room.x,o.x-o.w/2),right=Math.min(room.x+room.w,o.x+o.w/2);
  const top=Math.max(room.y,o.y-o.h/2),bottom=Math.min(room.y+room.h,o.y+o.h/2);
  return total+Math.max(0,right-left)*Math.max(0,bottom-top);
 },0);
 const free=Math.max(0,area-Math.min(area,occupied));
 return Math.max(1,Math.min(3,Math.floor(free/8500)));
}
export function exteriorSpawnAllowed(site:Pick<Site,'spawn'|'entrance'|'extract'>,
 zone:ExteriorZone,p:Pt):boolean{
 // The public arrival area belongs to the team. Side/rear yards can host guards.
 if(zone.id==='arrival-forecourt')return false;
 if(!clearOfInsertion(site,p,true))return false;
 return p.x>=zone.x-zone.w/2+9&&p.x<=zone.x+zone.w/2-9&&
  p.y>=zone.y-zone.h/2+9&&p.y<=zone.y+zone.h/2-9;
}
