/** VEH 6: shadow planner for marked parking. Never mutates the source site.
 * Activation is deliberately separate until fit and mobility are measured.
 */
import type {Site,ExteriorZone} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';
import {VEHICLE_DIMENSIONS,vehicleRecipe,type VehicleFamily} from './vehicle-catalog.ts';
import {parkingStallCandidates,parkingStallCount,reservedParkingBay} from './parking-stalls.ts';
import {arrivalAccessLane,overlapsArrivalLane} from './property-access-lane.ts';
import {exteriorDoorReserves,intersectsExteriorDoorReserve} from './exterior-door-reserve.ts';
import {planPublicStreet,overlapsPublicStreetRoad,type StreetRect} from './public-street-layout.ts';
import {intersectsServiceAccess} from './service-clear-route.ts';
import {seeded} from './seeded-rng.ts';
import {chooseVehicleArt} from './vehicle-palette.ts';
type Reject='bounds'|'room'|'road'|'sidewalk'|'arrival'|'door'|'encounter'|'occupied'|'reserved'|'service'|'stall-width'|'no-fit';
export type VehiclePlacementResult={vehicles:Obstacle[];diagnostics:{zoneId:string;target:number;accepted:number;rejections:Partial<Record<Reject,number>>}[]};
const intersects=(a:Pick<Obstacle,'x'|'y'|'w'|'h'>,b:Pick<Obstacle,'x'|'y'|'w'|'h'>,pad=0)=>
 Math.abs(a.x-b.x)<(a.w+b.w)/2+pad&&Math.abs(a.y-b.y)<(a.h+b.h)/2+pad;
const intersectsStreet=(a:Obstacle,b:StreetRect|null)=>!!b&&intersects(a,{x:b.x,y:b.y,w:b.width,h:b.depth},2);
const civilian:readonly VehicleFamily[]=['sedan','hatchback','suv','pickup','van'];
function fleet(site:Site,zone:ExteriorZone):readonly VehicleFamily[]{
 if(zone.vehicleParking?.role==='loading')return ['light-truck','van','pickup','light-truck','van'];
 if(zone.vehicleParking?.role==='residential')return ['sedan','hatchback','suv','pickup'];
 switch(site.archetype){
  case 'garage':case 'warehouse':case 'utility':return ['pickup','van','light-truck','sedan','hatchback'];
  case 'clinic':return ['sedan','hatchback','suv','van','pickup'];
  default:return civilian;
 }
}
// Preserve the old placement stream exactly: art choice now has its own
// independent stream and can never alter which physical bay/family fits.
function advanceLegacyArtStream(family:VehicleFamily,site:Site,rng:()=>number){
 if(site.archetype==='clinic'&&family==='van')rng();
 if(family==='light-truck')rng();
 rng();
}
function targetFor(site:Site,zone:ExteriorZone):number{
 const slots=parkingStallCount(zone);
 if(zone.vehicleParking?.role==='residential')return site.condition==='vacant'||(site.seed>>>0)%5===0?0:1;
 if(zone.vehicleParking?.role==='loading')return site.condition==='vacant'?0:Math.min(3,Math.max(1,slots-1));
 const ratio=site.condition==='busy'?.8:site.condition==='vacant'?.15:
  site.condition==='neglected'?.35:.6;
 return Math.max(0,Math.min(zone.vehicleParking?.version===1?8:4,slots-1,Math.round(slots*ratio)));
}
export function planVehiclePlacement(site:Site,seed=site.seed,modernOnly=false):VehiclePlacementResult{
 const vehicles:Obstacle[]=[],diagnostics:VehiclePlacementResult['diagnostics']=[];
 const bounds=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 const street=planPublicStreet(site),reserves=exteriorDoorReserves(site.doors);
 const protectedPoints=[...site.spawn,...site.enemies,site.objective,site.extract,site.entrance,
  ...(site.encounter?.actors??[]).flatMap(a=>[a.position,...(a.routine??[])]),
  ...(site.encounter?.neutrals??[]).flatMap(a=>[a.position,...(a.routine??[])])];
 for(const zone of site.exteriorZones??[]){
  if((zone.kind!=='parking'&&!zone.vehicleParking)||(modernOnly&&!zone.vehicleParking))continue;
  const target=targetFor(site,zone);
  const diag:VehiclePlacementResult['diagnostics'][number]={zoneId:zone.id,target,accepted:0,rejections:{}};
  diagnostics.push(diag);
  const reject=(reason:Reject)=>{diag.rejections[reason]=(diag.rejections[reason]??0)+1;};
  let key=seed^0x4c971a3;
  for(const ch of zone.id)key=Math.imul(key^ch.charCodeAt(0),16777619);
  const rng=seeded(key),artRng=seeded(key^0x371e6a93),roster=fleet(site,zone);
  const reserved=reservedParkingBay(site,zone);
  const broad=zone.vehicleParking?zone.vehicleParking.axis==='x':zone.w>=zone.h;
  const stride=(zone.vehicleParking?.alongLength??(broad?zone.w:zone.h))/parkingStallCount(zone);
  const lane=arrivalAccessLane(site,zone);
  const usedSlots=new Set<string>();
  for(let n=0;n<target;n++){
   const preferred=Math.floor(rng()*roster.length);
   const families=[roster[preferred],...roster.filter((_,i)=>i!==preferred)];
   let found=false;
   for(const family of families){
    const [width,depth]=VEHICLE_DIMENSIONS[family];
    const alongSize=zone.vehicleParking?.mode==='parallel'?width:depth;
    if(alongSize+8>stride){reject('stall-width');continue;}
    const candidates=parkingStallCandidates(zone,width,depth);
    if(!candidates.length){reject('no-fit');continue;}
    for(const slot of candidates){
     const slotKey=slot.x+':'+slot.y;
     if(usedSlots.has(slotKey))continue;
     const c:Obstacle={...slot,fixture:family,low:false};
     const {x,y,w,h}=c;
     if(x-w/2<bounds.minX+17||x+w/2>bounds.maxX-17||y-h/2<bounds.minY+23||y+h/2>bounds.maxY-22){reject('bounds');continue;}
     if(site.rooms.some(r=>x+w/2>r.x&&x-w/2<r.x+r.w&&y+h/2>r.y&&y-h/2<r.y+r.h)){reject('room');continue;}
     if(overlapsPublicStreetRoad(site,c,street)){reject('road');continue;}
     if(intersectsStreet(c,street?.sidewalk??null)||intersectsStreet(c,street?.curbRamp??null)){reject('sidewalk');continue;}
     if(lane&&overlapsArrivalLane(site,zone,c)){reject('arrival');continue;}
     if(intersectsServiceAccess(zone,c)){reject('service');continue;}
     if(reserved){
      const at=broad?x:y,center=broad?reserved.x:reserved.y,half=(broad?w:h)/2;
      const transfer=reserved.transferCenter??center+reserved.side*(reserved.bayWidth/2+5);
      if(Math.abs(at-center)<stride*.5||Math.abs(at-transfer)<half+(reserved.transferWidth??16)/2){reject('reserved');continue;}
     }
     if(intersectsExteriorDoorReserve(reserves,c)){reject('door');continue;}
     if(protectedPoints.some(p=>Math.abs(p.x-x)<w/2+32&&Math.abs(p.y-y)<h/2+32)){reject('encounter');continue;}
     if(site.cover.some(o=>intersects(o,c,17))||vehicles.some(o=>intersects(o,c,zone.vehicleParking?.version===1?8:17))){reject('occupied');continue;}
     advanceLegacyArtStream(family,site,rng);
     c.artVariant=chooseVehicleArt(family,{archetype:site.archetype,condition:site.condition,role:zone.vehicleParking?.role},artRng);
     c.vehicleProfile={version:3,configuration:vehicleRecipe(family,c.artVariant).configuration};
     c.artCondition=site.condition==='vacant'?'vacant':site.condition==='neglected'?'neglected':site.condition==='busy'?'used':'clean';
     vehicles.push(c);usedSlots.add(slotKey);diag.accepted++;found=true;break;
    }
    if(found)break;
   }
   if(!found)break;
  }
 }
 return {vehicles,diagnostics};
}
