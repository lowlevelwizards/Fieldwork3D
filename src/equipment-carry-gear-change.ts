/** L2.12C1 — preview, never execute, a change of load-bearing equipment.
 * The roster/campaign owner decides whether a real change is permitted.
 * Projection exposes magazine restaging, missing capacity, and exact field
 * consumable counts before UI authors promise a viable change.
 */
import type {MagazineItem} from './breach-magazines.ts';
import {setEquipmentChoice,type EquipmentLoadout} from './equipment-loadouts.ts';
import {secondaryCarryClaim,stageMagazines} from './equipment-magazine-placement.ts';
import {carryPlacementLedger} from './equipment-carry-placement.ts';
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
 equipmentMoves:readonly {id:string;kind:'medical'|'utility';from:string;to:string}[];
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
 const initialGear=carryPlacementLedger(kit,magazineBefore)
  .filter(p=>p.kind==='medical'||p.kind==='utility');
 const newGear=carryPlacementLedger(next,staged)
  .filter(p=>p.kind==='medical'||p.kind==='utility');
 const equipmentMoves=newGear.flatMap(p=>{
  const old=initialGear.find(o=>o.id===p.id&&o.kind===p.kind);
  return old&&old.location!==p.location?[{id:p.id,kind:p.kind as 'medical'|'utility',from:old.location,to:p.location}]:[];
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
  before,after,repacked,magazineMoves,equipmentMoves,itemMoves:movable,
  capacityDelta:Object.fromEntries(FIELD_CARRY_LOCATIONS.map(loc=>
   [loc,after.capacity[loc]-before.capacity[loc]])) as Record<FieldCarryLocation,number>,
  issues:fits?[]:after.conflicts
 };
}

/** One transaction candidate. Nothing here mutates the source or persists it.
 * The hosting Campaign / Roster adapter must still validate its own phase,
 * eligibility and current authoritative kit before applying this result.
 */
export type CarryGearChangeQuote=
 |{ok:false;reason:string;preview:CarryGearChangePreview}
 |{ok:true;changed:boolean;kit:EquipmentLoadout;magazines:MagazineItem[];
   inventory:FieldInventory;preview:CarryGearChangePreview};
export function quoteCarryGearChange(
 kit:EquipmentLoadout,magazines:readonly MagazineItem[],
 slot:CarryGearSlot,itemId:string,
 inventory:FieldInventory=kit.fieldInventory??initialFieldInventory(kit)
):CarryGearChangeQuote{
 const preview=previewCarryGearChange(kit,magazines,slot,itemId,inventory);
 if(slot==='backpack'&&itemId==='backpack-panel'&&kit.slots.armor!=='armor-carrier')
  return {ok:false,reason:'COMPATIBLE REAR ARMOR REQUIRED',preview};
 if(!preview.changed)return {ok:false,reason:'NO EQUIPMENT CHANGE',preview};
 if(!preview.fits)return {ok:false,reason:preview.issues.join(' · ')||
  'NO FITTED CARRY CONFIGURATION',preview};
 const next=setEquipmentChoice(kit,slot,itemId);
 if(!secondaryCarryClaim(next).valid)return {ok:false,reason:'SECONDARY CARRY CAPACITY EXCEEDED',preview};
 const oldSecondary=kit.secondary?.spareMagazines??[],newSecondary=next.secondary?.spareMagazines??[];
 if(oldSecondary.length!==newSecondary.length||newSecondary.some(m=>!oldSecondary.some(o=>o.id===m.id&&o.rounds===m.rounds)))
  return {ok:false,reason:'SECONDARY MAGAZINE OWNERSHIP WOULD CHANGE',preview};
 const placed=stageMagazines(magazines,next);
 const packed=preview.requiresRepack?autoPackFieldInventory(next,placed,inventory):inventory;
 if(!packed)return {ok:false,reason:'NOT ENOUGH SPACE TO REPACK',preview};
 if(!fieldCarryReport(next,placed,packed).valid)
  return {ok:false,reason:'CARRY CONFIGURATION IS INVALID',preview};
 for(const id of FIELD_ITEM_IDS)if(fieldQuantity(packed,id)!==fieldQuantity(inventory,id))
  return {ok:false,reason:'FIELD ITEM COUNT WOULD CHANGE',preview};
 if(placed.length!==magazines.length||placed.some(m=>{
  const old=magazines.find(x=>x.id===m.id);
  return !old||old.rounds!==m.rounds||old.weapon!==m.weapon;
 }))return {ok:false,reason:'MAGAZINE IDENTITY OR ROUNDS WOULD CHANGE',preview};
 return {ok:true,changed:true,kit:{...next,fieldInventory:packed},
  magazines:placed,inventory:packed,preview};
}
