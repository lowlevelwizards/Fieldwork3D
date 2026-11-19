/** L2.12F2: tactical use of a physically issued field consumable.
 * A TeamActor's existing live charge is the simulation authority. Its
 * detached deployment equipment is the placement/location manifest, not a
 * second source of free charges. Failed orders never mutate either value.
 */
import type {TeamActor} from './breach-game.ts';
import {CARRY_ACCESS_SECONDS} from './equipment-carry-placement.ts';
import {FIELD_ITEMS,fieldQuantity,
 fieldCarryReport,initialFieldInventory,type FieldCarryLocation,
 type FieldInventory} from './equipment-field-inventory.ts';

export type LiveFieldItem='flashbang'|'wedge'|'zip-tie';
type LiveFieldActor=Pick<TeamActor,
 'equipment'|'spareMagazines'|'flashCharges'|'wedgeRemaining'|'restraintRemaining'>;
export type FieldUseQuote={
 available:boolean;accessSeconds:number;location:FieldCarryLocation|null;
};
const counters:Readonly<Record<LiveFieldItem,
 'flashCharges'|'wedgeRemaining'|'restraintRemaining'>>={
 flashbang:'flashCharges',wedge:'wedgeRemaining','zip-tie':'restraintRemaining'
};
const preference:Readonly<Record<LiveFieldItem,readonly FieldCarryLocation[]>>={
 flashbang:['rig','belt','backpack','pocket'],
 wedge:['belt','rig','pocket','backpack'],
 'zip-tie':['belt','rig','pocket','backpack']
};
const inventoryOf=(actor:LiveFieldActor):FieldInventory|null=>
 actor.equipment?(actor.equipment.fieldInventory??
  initialFieldInventory(actor.equipment)):null;
/** Fixed order, bounded to four physical locations. No range check, scan,
 * or new cache on the 60 Hz simulation frame.
 */
export function quoteDeployedFieldUse(
 actor:LiveFieldActor,item:LiveFieldItem):FieldUseQuote{
 if(actor[counters[item]]<=0)return {available:false,accessSeconds:Infinity,location:null};
 const inventory=inventoryOf(actor);
 // Historical/synthetic actors without a deployed loadout keep the earlier
 // counter-only contract; this does not issue stock or bypass equipped gear.
 if(!inventory)return {available:true,accessSeconds:0,location:null};
 for(const location of preference[item]){
  if(inventory.stacks.some(row=>row.itemId===item&&
      row.location===location&&row.quantity>0)){
   return {available:true,accessSeconds:CARRY_ACCESS_SECONDS[location],
    location};
  }
 }
 return {available:false,accessSeconds:Infinity,location:null};
}
/** Called only at the actual successful GO-time effect. The caller resolves
 * physics, target and mission-wide limits BEFORE committing the one item.
 */
export function spendDeployedFieldItem(
 actor:LiveFieldActor,item:LiveFieldItem):boolean{
 const quote=quoteDeployedFieldUse(actor,item);
 if(!quote.available)return false;
 const key=counters[item];
 if(!actor.equipment||!quote.location){
  actor[key]--;return true;
 }
 const inventory=inventoryOf(actor)!;
 const index=inventory.stacks.findIndex(row=>
  row.itemId===item&&row.location===quote.location&&row.quantity>0);
 if(index<0)return false;
 const stacks=inventory.stacks.flatMap((row,i)=>{
  if(i!==index)return [{...row}];
  return row.quantity>1?[{...row,quantity:row.quantity-1}]:[];
 });
 actor.equipment={...actor.equipment,
  fieldInventory:{version:1,stacks}};
 actor[key]--;
 return true;
}
/** An UNWEDGE physically returns one of the placed wedges to its owner.
 * No fresh supply is created: there must already be a real wedged door,
 * validated by the order handler. The existing packing ledger decides if
 * the returning wedge fits. If not, the removed wedge is not conjured into
 * an overflowing carrier.
 */
export function restoreDeployedWedge(actor:LiveFieldActor):boolean{
 if(actor.equipment?.slots.utility!=='utility-wedge')return false;
 const kit=actor.equipment,inventory=inventoryOf(actor)!;
 const total=fieldQuantity(inventory,'wedge');
 if(total>=FIELD_ITEMS.wedge.maxPerOperator||
    actor.wedgeRemaining>=FIELD_ITEMS.wedge.maxPerOperator)return false;
 const locations:readonly FieldCarryLocation[]=['belt','rig','pocket','backpack'];
 for(const location of locations){
  if(!FIELD_ITEMS.wedge.locations.includes(location))continue;
  const stacks=inventory.stacks.map(row=>({...row}));
  const row=stacks.find(entry=>entry.itemId==='wedge'&&entry.location===location);
  if(row)row.quantity++;else stacks.push({itemId:'wedge',location,quantity:1});
  const candidate:FieldInventory={version:1,stacks};
  if(!fieldCarryReport(kit,actor.spareMagazines,candidate).valid)continue;
  actor.equipment={...kit,fieldInventory:candidate};
  actor.wedgeRemaining++;
  return true;
 }
 return false;
}
