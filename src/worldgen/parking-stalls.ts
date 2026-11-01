/** Parking positions share the exact same bay spacing as painted dividers.
 * Vehicles stand perpendicular to the longer axis of the paved parking zone.
 * Real body dimensions are rotated with the car; no mesh-only orientation.
 */
import type {ExteriorZone} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';
export const PARKING_VEHICLES=new Set(['sedan','pickup','van','suv']);
export function parkingStallCount(zone:ExteriorZone):number{
 return Math.min(5,Math.max(2,Math.floor(Math.max(zone.w,zone.h)/58)));
}
export function parkingStallCandidates(zone:ExteriorZone,width:number,depth:number):
 Pick<Obstacle,'x'|'y'|'w'|'h'|'orientation'>[]{
 const broad=zone.w>=zone.h,slots=parkingStallCount(zone);
 const w=broad?depth:width,h=broad?width:depth;
 const centers=Array.from({length:slots},(_,i)=>{
  const t=(i+.5)/slots-.5;
  return {x:zone.x+(broad?t*zone.w:0),
   y:zone.y+(broad?0:t*zone.h)};
 });
 // Fill outer stalls first; preserve the central pedestrian approach.
 centers.sort((a,b)=>Math.abs(broad?b.x-zone.x:b.y-zone.y)-
  Math.abs(broad?a.x-zone.x:a.y-zone.y)||a.x-b.x||a.y-b.y);
 return centers.filter(p=>p.x-w/2>=zone.x-zone.w/2+9&&
  p.x+w/2<=zone.x+zone.w/2-9&&p.y-h/2>=zone.y-zone.h/2+9&&
  p.y+h/2<=zone.y+zone.h/2-9).map(p=>({...p,w,h,
   orientation:broad?1:0}));
}
