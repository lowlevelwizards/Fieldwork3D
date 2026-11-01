/** Physical arrival clearance shared by outside furnishing and path markings.
 * It protects the actual front door-to-property approach, not a decorative
 * route that parked vehicles and dumpsters may obstruct.
 */
import type {Site,ExteriorZone} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';
type Entrance=Pick<Site,'doors'|'entrySide'|'entrance'>;
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
export type ArrivalLane={x:number;y:number;w:number;h:number};
export function arrivalAccessLane(site:Entrance,zone:ExteriorZone):ArrivalLane|null{
 if(zone.id!=='arrival-forecourt'||zone.w<24||zone.h<24)return null;
 const front=site.doors.find(d=>d.id==='FRONT');
 const at=front?{x:(front.a.x+front.b.x)/2,y:(front.a.y+front.b.y)/2}:site.entrance;
 const side=site.entrySide??'south';
 if(side==='north'||side==='south')
  return {x:clamp(at.x,zone.x-zone.w/2+14,zone.x+zone.w/2-14),
   y:zone.y,w:24,h:Math.max(12,zone.h-4)};
 return {x:zone.x,
  y:clamp(at.y,zone.y-zone.h/2+14,zone.y+zone.h/2-14),
  w:Math.max(12,zone.w-4),h:24};
}
export function overlapsArrivalLane(
 site:Entrance,zone:ExteriorZone,candidate:Obstacle):boolean{
 const lane=arrivalAccessLane(site,zone);
 return !!lane&&Math.abs(candidate.x-lane.x)<(candidate.w+lane.w)/2+8&&
  Math.abs(candidate.y-lane.y)<(candidate.h+lane.h)/2+8;
}
