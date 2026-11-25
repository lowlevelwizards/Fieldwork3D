/** VEH: a single private paved parking row and circulation aisle.
 * This is an offline proposal, not an invitation to squeeze cars into a
 * decorative parking rectangle. No changes to historical site snapshots.
 */
import type {Site,ExteriorZone} from '../breach-site.ts';
import {planPublicStreet} from './public-street-layout.ts';
import {arrivalAccessLane} from './property-access-lane.ts';
export type VehicleParkingLayout=Readonly<{
 mode:'parallel'|'perpendicular';
 axis:'x'|'y';
 rowCenter:number;rowDepth:number;aisleCenter:number;aisleDepth:number;
 alongCenter:number;alongLength:number;count:number;
}>;
const MIN_AISLE=48,EDGE=6;
export function proposeVehicleParkingLayout(site:Site,zone:ExteriorZone):VehicleParkingLayout|null{
 if(zone.id!=='arrival-forecourt'||!['parking','driveway'].includes(zone.kind))return null;
 const side=site.entrySide??'south',axis=side==='north'||side==='south'?'x':'y';
 const sign=side==='south'||side==='east'?1:-1;
 const across=axis==='x'?'y':'x';
 const long=axis==='x'?zone.w:zone.h,depth=axis==='x'?zone.h:zone.w;
 const along=zone[axis],center=zone[across];
 const street=planPublicStreet(site);
 if(!street)return null;
 const strip=street.sidewalk??street.road,stripSize=across==='x'?strip.width:strip.depth;
 // Work in signed, outward coordinates, clip to the private side of road
 // and sidewalk. The parking row never uses these public surfaces.
 const inner=sign*center-depth/2+EDGE;
 const outer=Math.min(sign*center+depth/2-EDGE,sign*strip[across]-stripSize/2-EDGE);
 const usable=outer-inner;
 const alongLength=long-EDGE*2;
 if(alongLength<104||usable<48+MIN_AISLE)return null;
 // An arrival lane must actually exist; its intersection with the row
 // is kept vacant by the placement planner. No fake disconnected lot.
 if(!arrivalAccessLane(site,zone))return null;
 const mode=usable>=104+MIN_AISLE?'perpendicular':'parallel';
 const rowDepth=mode==='parallel'?48:104;
 const count=Math.min(5,Math.floor(alongLength/(mode==='parallel'?104:52)));
 if(count<2)return null;
 return {mode,axis,rowCenter:sign*(inner+rowDepth/2),rowDepth,
  aisleCenter:sign*(inner+rowDepth+MIN_AISLE/2),aisleDepth:MIN_AISLE,
  alongCenter:along,alongLength,count};
}
export function proposedVehicleParkingSite(site:Site):Site{
 const zones=site.exteriorZones??[];
 const next=zones.map(zone=>{
  const layout=proposeVehicleParkingLayout(site,zone);
  return layout?{...zone,vehicleParking:layout}:zone;
 });
 return next.some((z,i)=>z!==zones[i])?{...site,exteriorZones:next}:site;
}
