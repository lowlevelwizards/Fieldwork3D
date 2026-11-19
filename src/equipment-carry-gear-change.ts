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
 const movable:{id:string;from:string;to:string;quantity:number}[]=[];
 if(packed){
  for(const id of FIELD_ITEM_IDS){
   // Exact conservation: cancel retained quantities at each original carrier,
   // then match remaining source and destination units one at a time.
   if(fieldQuantity(packed,id)!==fieldQuantity(inventory,id))continue;
   const left:Record<FieldCarryLocation,number>={rig:0,belt:0,pocket:0,backpack:0};
   const right:Record<FieldCarryLocation,number>={rig:0,belt:0,pocket:0,backpack:0};
   for(const row of inventory.stacks.filter(s=>s.itemId===id))
    left[row.location]+=row.quantity;
   for(const row of packed.stacks.filter(s=>s.itemId===id))
    right[row.location]+=row.quantity;
   for(const loc of FIELD_CARRY_LOCATIONS){
    const retained=Math.min(left[loc],right[loc]);
    left[loc]-=retained;right[loc]-=retained;
   }
   for(const from of FIELD_CARRY_LOCATIONS)
    for(const to of FIELD_CARRY_LOCATIONS){
     if(from===to||left[from]<=0||right[to]<=0)continue;
     const quantity=Math.min(left[from],right[to]);
     left[from]-=quantity;right[to]-=quantity;
     movable.push({id,from,to,quantity});
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
