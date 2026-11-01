/** A room label is not proof that a self-contained dwelling actually works.
 * Audit the whole suite/flat, including physical ownership and required fixtures.
 */
import type {Site} from '../breach-site.ts';
import {assessRoomContracts} from './room-contracts.ts';

export type UnitContractResult={
 unitId:string;kind:'apartment'|'motel';
 roomIds:string[];missingRoles:string[];incompleteRooms:string[];
 crossUnitDoorIds:string[];missingEntry:boolean;missingBathAccess:boolean;
 structuralComplete:boolean;complete:boolean;
};
export function assessUnitContracts(site:Pick<Site,'rooms'|'doors'|'cover'|'units'>):UnitContractResult[]{
 const contracts=assessRoomContracts(site);
 return (site.units??[]).map(unit=>{
  const unitRooms=site.rooms.filter(r=>r.unitId===unit.id);
  const roles=new Set(unitRooms.map(r=>r.purpose));
  const required=unit.kind==='motel'?['guest','bathroom']:
   ['living','bedroom','kitchen','bathroom'];
  const missingRoles=required.filter(role=>!roles.has(role));
  const ids=new Set(unitRooms.map(r=>r.id));
  const incompleteRooms=contracts.filter(c=>
   c.roomIds.some(id=>ids.has(id))&&!c.complete).flatMap(c=>c.roomIds.filter(id=>ids.has(id)));
  const crossUnitDoorIds:string[]=[];
  let hasEntry=false,hasBathAccess=false;
  for(const door of site.doors){
   const mid={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
   const touching=site.rooms.filter(r=>mid.x>=r.x-.1&&mid.x<=r.x+r.w+.1&&
    mid.y>=r.y-.1&&mid.y<=r.y+r.h+.1);
   const owners=new Set(touching.map(r=>r.unitId).filter((id):id is string=>!!id));
   if(owners.has(unit.id)&&owners.size>1)crossUnitDoorIds.push(door.id);
   const owned=touching.filter(r=>r.unitId===unit.id);
   // Shared halls/galleries are public; a one-room FRONT threshold may
   // instead lead directly outside the building. Neither is a neighboring flat.
   if(owned.length&&(touching.some(r=>!r.unitId)||
     (door.id==='FRONT'&&touching.length===1)))hasEntry=true;
   if(owned.some(r=>r.purpose==='bathroom')&&
     owned.some(r=>r.purpose!=='bathroom'))hasBathAccess=true;
  }
  const missingEntry=!hasEntry;
  const missingBathAccess=roles.has('bathroom')&&!hasBathAccess;
  const structuralComplete=missingRoles.length===0&&crossUnitDoorIds.length===0&&
    !missingEntry&&!missingBathAccess;
  return {unitId:unit.id,kind:unit.kind,roomIds:unit.roomIds,missingRoles,
   incompleteRooms:[...new Set(incompleteRooms)],crossUnitDoorIds,
   missingEntry,missingBathAccess,
   structuralComplete,complete:structuralComplete&&incompleteRooms.length===0};
 });
}
