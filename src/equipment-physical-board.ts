/** L2.11A: one read-only physical presentation of the existing carried kit.
 * This module never issues, packs, saves or consumes equipment. Stock and
 * placement remain owned by the field, magazine and carry ledgers.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {FIELD_CARRY_LOCATIONS,FIELD_ITEMS,fieldCarryReport,
 type FieldInventory,type FieldCarryLocation,type FieldItemId} from './equipment-field-inventory.ts';
import {carryPlacementLedger} from './equipment-carry-placement.ts';
import {EQUIPMENT_CATALOG} from './equipment-catalog.ts';

export type PhysicalCarryTile={
 id:string;label:string;kind:'field'|'magazine'|'medical'|'utility';
 location:FieldCarryLocation|'overflow';quantity:number;spaces:number;
 /** Only field consumables are movable through L2.11C's atomic operation. */
 itemId?:FieldItemId;
 /** Actual spare magazine identity, never a new ammo pool. */
 magazineId?:string;
 accessSeconds?:number;
};
export type PhysicalCarryZone={
 location:FieldCarryLocation;used:number;capacity:number;remaining:number;
 items:PhysicalCarryTile[];
};
export type PhysicalCarryBoard={
 zones:PhysicalCarryZone[];unplaced:PhysicalCarryTile[];
 conflicts:readonly string[];valid:boolean;
};
export function physicalCarryBoard(kit:EquipmentLoadout,
 magazines:readonly MagazineItem[],inventory:FieldInventory):PhysicalCarryBoard{
 const report=fieldCarryReport(kit,magazines,inventory);
 const zones=FIELD_CARRY_LOCATIONS.map(location=>({
  location,used:report.used[location],capacity:report.capacity[location],
  remaining:report.capacity[location]-report.used[location],
  items:[] as PhysicalCarryTile[]
 }));
 const unplaced:PhysicalCarryTile[]=[];
 const place=(tile:PhysicalCarryTile)=>{
  const zone=zones.find(z=>z.location===tile.location);
  if(zone)zone.items.push(tile);
  else unplaced.push(tile);
 };
 for(const row of inventory.stacks){
  const definition=FIELD_ITEMS[row.itemId];
  if(!definition?.usable||row.quantity<=0)continue;
  place({id:'field:'+row.itemId+':'+row.location,
   label:definition.name,kind:'field',itemId:row.itemId,
   location:row.location,quantity:row.quantity,
   spaces:row.quantity*definition.spaces});
 }
 const byId=new Map(magazines.map((m,i)=>[m.id,{item:m,index:i}]));
 for(const row of carryPlacementLedger(kit,magazines)){
  // Wedges are the individual field stacks above, never a duplicate
  // decorative utility item, including for legacy loadouts.
  if(row.id==='utility-wedge')continue;
  const match=row.kind==='magazine'?byId.get(row.id):undefined;
  const title=match?'MAG '+String(match.index+1).padStart(2,'0'):
   EQUIPMENT_CATALOG[row.id]?.name??row.id;
  const rounds=match?.item.rounds;
  place({id:row.kind+':'+row.id,label:typeof rounds==='number'?
   title+' · '+rounds+' rounds':title,kind:row.kind,
   location:row.location,quantity:1,spaces:row.spaces,
   magazineId:match?.item.id,accessSeconds:row.accessSeconds});
 }
 return {zones,unplaced,conflicts:report.conflicts,valid:report.valid};
}
