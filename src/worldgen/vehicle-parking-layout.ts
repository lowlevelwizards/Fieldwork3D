/** VEH: a single private paved parking row and circulation aisle.
 * This is an offline proposal, not an invitation to squeeze cars into a
 * decorative parking rectangle. No changes to historical site snapshots.
 */
import type {Site,ExteriorZone} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';
import {primaryEntranceSpan} from './primary-entrance.ts';
import {planPublicStreet} from './public-street-layout.ts';
import {arrivalAccessLane} from './property-access-lane.ts';
import {proposeStreetParkingLayout} from './street-parking.ts';
export type VehicleParkingLayout=Readonly<{
 version?:1;
 mode:'parallel'|'perpendicular';
 role?:'public'|'residential'|'loading';
 axis:'x'|'y';
 rowCenter:number;rowDepth:number;aisleCenter:number;aisleDepth:number;
 /** Optional mirrored second row across the same physical aisle. */
 secondRowCenter?:number;
 alongCenter:number;alongLength:number;count:number;
 /** Dedicated vehicle entrance, separate from the pedestrian route. */
 access?:Readonly<{alongCenter:number;width:number;acrossCenter:number;depth:number}>;
}>;
const MIN_AISLE=48,EDGE=6;
export function proposeVehicleParkingLayout(site:Site,zone:ExteriorZone):VehicleParkingLayout|null{
 if(site.streetInfrastructure)return proposeStreetParkingLayout(site,zone);
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
 const rowDepth=mode==='parallel'?48:Math.min(140,usable-MIN_AISLE);
 const loading=['garage','warehouse','utility'].includes(site.archetype??'')&&mode==='perpendicular'&&rowDepth>=134;
 const count=Math.min(5,Math.floor(alongLength/(mode==='parallel'?104:loading?65:52)));
 if(count<2)return null;
 return {mode,role:loading?'loading':'public',axis,rowCenter:sign*(inner+rowDepth/2),rowDepth,
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

/** Furnishing must not consume a vehicle row or its circulation aisle.
 * A small margin preserves operator clearance at the painted edges.
 */
export function intersectsVehicleParkingReserve(zone:ExteriorZone,c:Pick<Obstacle,'x'|'y'|'w'|'h'>):boolean{
 const p=zone.vehicleParking;if(!p)return false;
 if(p.access){const a=p.access,broad=p.axis==='x';
  if(Math.abs((broad?c.x:c.y)-a.alongCenter)<((broad?c.w:c.h)+a.width)/2+4&&Math.abs((broad?c.y:c.x)-a.acrossCenter)<((broad?c.h:c.w)+a.depth)/2+4)return true;
 }
 const along=p.axis==='x'?c.x:c.y,across=p.axis==='x'?c.y:c.x;
 const alongHalf=(p.axis==='x'?c.w:c.h)/2,acrossHalf=(p.axis==='x'?c.h:c.w)/2;
 if(Math.abs(along-p.alongCenter)>=p.alongLength/2+alongHalf+4)return false;
 return Math.abs(across-p.rowCenter)<p.rowDepth/2+acrossHalf+4||
  (p.secondRowCenter!==undefined&&Math.abs(across-p.secondRowCenter)<p.rowDepth/2+acrossHalf+4)||
  (p.aisleDepth>0&&Math.abs(across-p.aisleCenter)<p.aisleDepth/2+acrossHalf+4);
}

/** A domestic bay is a narrow strip reaching the private side of the
 * sidewalk, never an entire lawn paved as a commercial forecourt. */
export function proposeResidentialDriveway(site:Site,front:ExteriorZone):{driveway:ExteriorZone;yard:ExteriorZone}|null{
 if(!['house','townhouse'].includes(site.archetype??'')||front.id!=='arrival-forecourt')return null;
 const side=site.entrySide??'south',axis=side==='north'||side==='south'?'x':'y',across=axis==='x'?'y':'x';
 const sign=side==='south'||side==='east'?1:-1;
 const long=axis==='x'?front.w:front.h,depth=axis==='x'?front.h:front.w;
 const street=planPublicStreet(site);if(!street)return null;
 const strip=street.sidewalk??street.road,stripSize=axis==='x'?strip.depth:strip.width;
 const inner=sign*front[across]-depth/2+4;
 const outer=site.streetInfrastructure?sign*site.streetInfrastructure.privateEdge:sign*strip[across]-stripSize/2;
 const available=outer-inner;
 const bayDepth=Math.min(136,available-8);
 if(long<166||bayDepth<87)return null;
 const bayWidth=site.streetInfrastructure?64:62,frontDoor=primaryEntranceSpan(site.doors);
 const entrance=frontDoor?(frontDoor.a[axis]+frontDoor.b[axis])/2:site.entrance[axis];
 const edges=[-1,1].map(s=>({s,at:front[axis]+s*(long/2-bayWidth/2)}))
  .sort((a,b)=>Math.abs(b.at-entrance)-Math.abs(a.at-entrance));
 const selected=edges[0];
 if(Math.abs(selected.at-entrance)<bayWidth/2+58)return null;
 const along=selected.at,center=sign*(inner+available/2);
 const driveway:ExteriorZone={id:'residential-driveway',kind:'driveway',x:axis==='x'?along:center,y:axis==='x'?center:along,
  w:axis==='x'?bayWidth:available,h:axis==='x'?available:bayWidth,
  vehicleParking:{...(site.streetInfrastructure?{version:1 as const}:{}),role:'residential',mode:'perpendicular',axis,rowCenter:sign*(inner+4+bayDepth/2),rowDepth:bayDepth,
   aisleCenter:sign*(outer-2),aisleDepth:0,alongCenter:along,alongLength:bayWidth-8,count:1}};
 const remainingCenter=front[axis]-selected.s*bayWidth/2;
 const yard={...front,[axis]:remainingCenter,...(axis==='x'?{w:long-bayWidth}:{h:long-bayWidth})};
 return {driveway,yard};
}
