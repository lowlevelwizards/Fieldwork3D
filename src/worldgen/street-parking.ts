/** ST5: dimension-driven private parking pilot. No road overlap and no
 * stretching stalls to fill frontage. Dedicated vehicle entrance is kept
 * separate from the pedestrian approach. Single rows first; double rows
 * and angled geometry require the subsequent multi-row layout contract. */
import type {Site,ExteriorZone} from '../breach-site.ts';
import type {VehicleParkingLayout} from './vehicle-parking-layout.ts';
import {STREET_DIMENSIONS as D} from './street-standards.ts';
import {arrivalAccessLane} from './property-access-lane.ts';
export function proposeStreetParkingLayout(site:Site,zone:ExteriorZone):VehicleParkingLayout|null{
 const street=site.streetInfrastructure;
 if(!street||zone.id!=='arrival-forecourt'||!['parking','driveway'].includes(zone.kind))return null;
 const axis=street.axis,across=axis==='x'?'y':'x',sign=street.entry==='south'||street.entry==='east'?1:-1;
 const long=axis==='x'?zone.w:zone.h,deep=axis==='x'?zone.h:zone.w;
 const inner=sign*zone[across]-deep/2+D.parkingEdge;
 const outer=Math.min(sign*zone[across]+deep/2-D.parkingEdge,sign*street.privateEdge-D.parkingEdge);
 const usable=outer-inner;
 const industrial=['garage','warehouse','utility'].includes(site.archetype??'');
 const loading=industrial&&usable>=D.loading.length+D.aisle.twoWay;
 const perpendicular=loading||usable>=D.parking.length+D.aisle.twoWay;
 const mode=perpendicular?'perpendicular':'parallel';
 const rowDepth=loading?D.loading.length:perpendicular?D.parking.length:D.parallel.width;
 const aisleDepth=perpendicular?D.aisle.twoWay:D.aisle.oneWay;
 if(usable<rowDepth+aisleDepth)return null;
 const lane=arrivalAccessLane(site,zone);if(!lane)return null;
 const at=axis==='x'?lane.x:lane.y;
 const accessWidth=loading?D.industrialAccess:D.driveway.single;
 const start=zone[axis]-long/2+D.parkingEdge,end=zone[axis]+long/2-D.parkingEdge;
 const pitch=loading?D.loading.width:perpendicular?D.parking.width:D.parallel.length;
 // Leave the pedestrian access as a complete independent corridor.
 // Choose the larger side; put the vehicle entrance at its outer end.
 const sides=[{lo:start,hi:Math.min(end,at-D.pedestrianClear/2-10),side:-1},{lo:Math.max(start,at+D.pedestrianClear/2+10),hi:end,side:1}].sort((a,b)=>(b.hi-b.lo)-(a.hi-a.lo));
 for(const s of sides){
  const count=Math.min(14,Math.floor((s.hi-s.lo-accessWidth-8)/pitch));
  if(count<2)continue;
  const length=count*pitch;
  const entrance=s.side<0?s.lo+accessWidth/2:s.hi-accessWidth/2;
  const alongCenter=s.side<0?s.lo+accessWidth+8+length/2:s.hi-accessWidth-8-length/2;
  return {version:1,mode,role:loading?'loading':'public',axis,rowCenter:sign*(inner+rowDepth/2),rowDepth,
   aisleCenter:sign*(inner+rowDepth+aisleDepth/2),aisleDepth,alongCenter,alongLength:length,count,
   access:{alongCenter:entrance,width:accessWidth,acrossCenter:sign*(inner+(outer-inner)/2),depth:outer-inner}};
 }
 return null;
}
