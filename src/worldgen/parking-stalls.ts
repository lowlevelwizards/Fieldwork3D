/** Parking positions share the exact same bay spacing as painted dividers.
 * Vehicles stand perpendicular to the longer axis of the paved parking zone.
 * Real body dimensions are rotated with the car; no mesh-only orientation.
 */
import type {ExteriorZone} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';
import type {Site} from '../breach-site.ts';
import {arrivalAccessLane} from './property-access-lane.ts';
export const PARKING_VEHICLES=new Set(['sedan','pickup','van','suv']);
export function parkingStallCount(zone:ExteriorZone):number{
 return Math.min(5,Math.max(2,Math.floor(Math.max(zone.w,zone.h)/58)));
}
export function parkingStallCandidates(zone:ExteriorZone,width:number,depth:number):
 Pick<Obstacle,'x'|'y'|'w'|'h'|'orientation'>[]{
 const broad=zone.w>=zone.h,slots=parkingStallCount(zone);
 const w=broad?depth:width,h=broad?width:depth;
 const orientation:0|1=broad?1:0;
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
   orientation}));
}

/** Reserved-bay center used by BOTH painted markings and physical signs.
 * A single authoritative choice prevents a parking sign from drifting to
 * an arbitrary corner unrelated to the actual marked stall.
 */
export function reservedParkingBay(
 site:Pick<Site,'entrySide'|'doors'|'entrance'>,
 zone:ExteriorZone
):{x:number;y:number;bayWidth:number;short:number;broad:boolean;
   side:1|-1}|null{
 if(zone.kind!=='parking')return null;
 const broad=zone.w>=zone.h,slots=parkingStallCount(zone);
 const long=broad?zone.w:zone.h,short=broad?zone.h:zone.w;
 if(slots<2||long<132||short<55)return null;
 const stride=long/slots;
 const lane=arrivalAccessLane(site,zone);
 const transverse=broad?lane?.x:lane?.y;
 const candidates=Array.from({length:slots},(_,i)=>({
  i,pos:(i+.5)*stride-long/2+(broad?zone.x:zone.y)
 })).filter(p=>transverse===undefined||
   Math.abs(p.pos-transverse)>stride*.8);
 candidates.sort((a,b)=>
  Math.abs(a.pos-(transverse??(broad?zone.x:zone.y)))-
  Math.abs(b.pos-(transverse??(broad?zone.x:zone.y)))||
  a.i-b.i);
 const selected=candidates[0];if(!selected)return null;
 const side:1|-1=selected.pos<(transverse??(broad?zone.x:zone.y))?1:-1;
 return {x:broad?selected.pos:zone.x,
  y:broad?zone.y:selected.pos,
  bayWidth:Math.min(stride*.64,42),short,broad,side};
}
