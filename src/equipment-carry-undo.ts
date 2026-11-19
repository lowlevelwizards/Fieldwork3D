/** L2.12E1 — UI-only, bounded physical carry undo.
 * No persistence, stock ownership or automatic commit lives here.
 * The Campaign / Roster owner must authorize the returned candidate again.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {FIELD_ITEM_IDS,fieldQuantity,fieldCarryReport,initialFieldInventory}
 from './equipment-field-inventory.ts';
export type CarryUndoSnapshot={loadout:EquipmentLoadout;magazines:MagazineItem[]};
export type CarryUndoQuote=
 |{ok:true;restore:CarryUndoSnapshot}
 |{ok:false;reason:string};
export function captureCarryUndo(loadout:EquipmentLoadout,
 magazines:readonly MagazineItem[]):CarryUndoSnapshot{
 return {loadout:structuredClone(loadout),magazines:structuredClone(magazines)};
}
const fingerprint=(x:CarryUndoSnapshot)=>JSON.stringify(x);
const keyed=(items:readonly MagazineItem[])=>{
 const ids=new Map<string,MagazineItem>();
 for(const item of items){
  if(ids.has(item.id))return null;
  ids.set(item.id,item);
 }
 return ids;
};
/** Explicit rejection prevents undo from fabricating old ammo or issuing stock.
 * Only a carrying layout may be restored; equipped weapons, attachments and
 * medical/tool loadout selectors are never rolled back by physical carry undo.
 */
export function quoteCarryUndo(current:CarryUndoSnapshot,
 before:CarryUndoSnapshot):CarryUndoQuote{
 const here=keyed(current.magazines),previous=keyed(before.magazines);
 if(!here||!previous||here.size!==previous.size)
  return {ok:false,reason:'MAGAZINE INVENTORY HAS CHANGED'};
 for(const [id,item] of here){
  const old=previous.get(id);
  if(!old||old.weapon!==item.weapon||old.rounds!==item.rounds)
   return {ok:false,reason:'MAGAZINE AMMUNITION OR IDENTITY HAS CHANGED'};
 }
 const allowed=new Set(['rig','belt','backpack']);
 for(const slot of Object.keys(current.loadout.slots)){
  if(allowed.has(slot))continue;
  if(current.loadout.slots[slot as keyof typeof current.loadout.slots]!== 
     before.loadout.slots[slot as keyof typeof before.loadout.slots])
   return {ok:false,reason:'OTHER EQUIPMENT WAS CHANGED'};
 }
 const currentField=current.loadout.fieldInventory??
  initialFieldInventory(current.loadout);
 const oldField=before.loadout.fieldInventory??
  initialFieldInventory(before.loadout);
 for(const id of FIELD_ITEM_IDS)
  if(fieldQuantity(currentField,id)!==fieldQuantity(oldField,id))
   return {ok:false,reason:'FIELD EQUIPMENT SUPPLY HAS CHANGED'};
 if(!fieldCarryReport(before.loadout,before.magazines,oldField).valid)
  return {ok:false,reason:'PREVIOUS CARRY CONFIGURATION NO LONGER FITS'};
 return {ok:true,restore:captureCarryUndo(before.loadout,before.magazines)};
}
export class CarryKitUndoHistory{
 private readonly prior=new Map<string,{before:CarryUndoSnapshot;after:string}>();
 record(operatorId:string,before:CarryUndoSnapshot,after:CarryUndoSnapshot):void{
  if(fingerprint(before)===fingerprint(after))return;
  this.prior.set(operatorId,{
   before:captureCarryUndo(before.loadout,before.magazines),
   after:fingerprint(after)
  });
 }
 peek(operatorId:string,current:CarryUndoSnapshot):CarryUndoQuote{
  const previous=this.prior.get(operatorId);
  if(!previous)return {ok:false,reason:'NO CARRY CHANGE TO UNDO'};
  if(previous.after!==fingerprint(current))
   return {ok:false,reason:'KIT HAS CHANGED SINCE LAST TRANSFER'};
  return quoteCarryUndo(current,previous.before);
 }
 clear(operatorId:string):void{this.prior.delete(operatorId);}
}
