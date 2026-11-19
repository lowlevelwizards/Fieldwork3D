/** L2.12C1 — preview, never execute, a change of load-bearing equipment.
 * The roster/campaign owner decides whether a real change is permitted.
 * Projection exposes magazine restaging, missing capacity, and exact field
 * consumable counts before UI authors promise a viable change.
 */
import type {MagazineItem} from './breach-magazines.ts';
import {setEquipmentChoice,type EquipmentLoadout} from './equipment-loadouts.ts';
import {stageMagazines} from './equipment-magazine-placement.ts';
import {FIELD_CARRY_LOCATIONS,FIELD_ITEM_IDS,autoPackFieldInventory,
 fieldCarryReport,fieldQuantity,initialFieldInventory,
 type FieldCarryLocation,type FieldInventory} from './equipment-field-inventory.ts';
export type CarryGearSlot='rig'|'belt'|'backpack';
export type CarryGearChangePreview={
 changed:boolean;fits:boolean;requiresRepack:boolean;
 before:ReturnType<typeof fieldCarryReport>;
 after:ReturnType<typeof fieldCarryReport>;
 repacked:ReturnType<typeof fieldCarryReport>|null;
 capacityDelta:Record<FieldCarryLocation,number>;
 magazineMoves:readonly {id:string;from:string;to:string}[];
 itemMoves:readonly {id:string;from:string;to:string;quantity:number}[];
 issues:readonly string[];
};
export function previewCarryGearChange(
 kit:EquipmentLoadout,magazines:readonly MagazineItem[],
 slot:CarryGearSlot,itemId:string,
 inventory:FieldInventory=kit.fieldInventory??initialFieldInventory(kit)
):CarryGearChangePreview{
 const before=fieldCarryReport(kit,magazines,inventory);
 const next=setEquipmentChoice(kit,slot,itemId);
 const changed=next!==kit;
 const staged=stageMagazines(magazines,next);
 const after=fieldCarryReport(next,staged,inventory);
 const packed=changed&&!after.valid?autoPackFieldInventory(next,staged,inventory):null;
 const repacked=packed?fieldCarryReport(next,staged,packed):null;
 const magazineBefore=stageMagazines(magazines,kit);
 const magazineMoves=staged.flatMap(m=>{
  const old=magazineBefore.find(p=>p.id===m.id);
  return old&&old.location!==m.location?[{id:m.id,from:old.location,to:m.location}]:[];
 });
 const itemMoves:CarryGearChangePreview['itemMoves']=[]; // assigned below
 const movable:{id:string;from:string;to:string;quantity:number}[]=[];
 if(packed){
  for(const id of FIELD_ITEM_IDS){
   if(fieldQuantity(packed,id)!==fieldQuantity(inventory,id))continue;
   for(const old of inventory.stacks.filter(s=>s.itemId===id)){
    const retained=packed.stacks.find(s=>s.itemId===id&&s.location===old.location);
    const removed=old.quantity-(retained?.quantity??0);
    if(removed<=0)continue;
    const dest=packed.stacks.find(s=>s.itemId===id&&s.location!==old.location);
    if(dest)movable.push({id,from:old.location,to:dest.location,quantity:removed});
   }
  }
 }
 const fits=after.valid||(repacked?.valid??false);
 return {
  changed,fits,requiresRepack:changed&&!after.valid,
  before,after,repacked,magazineMoves,itemMoves:movable,
  capacityDelta:Object.fromEntries(FIELD_CARRY_LOCATIONS.map(loc=>
   [loc,after.capacity[loc]-before.capacity[loc]])) as Record<FieldCarryLocation,number>,
  issues:fits?[]:after.conflicts
 };
}
