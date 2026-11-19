/** L2.6B — bounded UI-only one-step undo for a physical gadget transaction.
 * Never owns physical stock or applies state. The caller must revalidate
 * the returned candidate through the same authoritative equip adapter.
 */
import type {FieldInventory} from './equipment-field-inventory.ts';
const fingerprint=(x:FieldInventory)=>JSON.stringify(x);
export class FieldInventoryUndoHistory{
 private readonly previous=new Map<string,{before:FieldInventory;after:string}>();
 record(operatorId:string,before:FieldInventory,after:FieldInventory):void{
  if(fingerprint(before)===fingerprint(after))return;
  this.previous.set(operatorId,{before:structuredClone(before),
   after:fingerprint(after)});
 }
 peek(operatorId:string,current:FieldInventory):FieldInventory|null{
  const entry=this.previous.get(operatorId);
  if(!entry||entry.after!==fingerprint(current))return null;
  return structuredClone(entry.before);
 }
 clear(operatorId:string):void{this.previous.delete(operatorId);}
}
