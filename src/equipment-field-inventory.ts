/** L2.0 — physical, countable, pre-deployment field consumables.
 * No stock is created here. Quick Play/Campaign adapters authorize issuance;
 * the tactical simulation consumes only items actually issued.
 * Existing magazine identities and medical item authority stay unchanged.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {magazineSpace} from './equipment-magazine-placement.ts';
import {carryPlacementLedger} from './equipment-carry-placement.ts';

export const FIELD_CARRY_LOCATIONS=['rig','belt','pocket','backpack'] as const;
export type FieldCarryLocation=typeof FIELD_CARRY_LOCATIONS[number];
export const FIELD_ITEM_IDS=[
 'flashbang','wedge','smoke','frag','door-charge','chem-light'
] as const;
export type FieldItemId=typeof FIELD_ITEM_IDS[number];
export type FieldItemDefinition={
 id:FieldItemId;name:string;massKg:number;spaces:number;
 maxPerOperator:number;locations:readonly FieldCarryLocation[];
 /** Distinguishes physical catalog support from live tactical functionality. */
 usable:boolean;description:string;
};
export const FIELD_ITEMS:Readonly<Record<FieldItemId,FieldItemDefinition>>={
 flashbang:{id:'flashbang',name:'Flashbang',massKg:.38,spaces:1,
  maxPerOperator:4,locations:['rig','belt','backpack'],usable:true,
  description:'A finite distraction device. Exposed pouches provide faster access.'},
 wedge:{id:'wedge',name:'Door wedge',massKg:.14,spaces:1,
  maxPerOperator:4,locations:['rig','belt','pocket','backpack'],usable:true,
  description:'A physical wedge for a suitable door; requires the existing wedge tool capability.'},
 smoke:{id:'smoke',name:'Smoke grenade',massKg:.45,spaces:1,
  maxPerOperator:3,locations:['rig','belt','backpack'],usable:false,
  description:'Reserved for the future gameplay smoke effect; not yet available to equip.'},
 frag:{id:'frag',name:'Fragmentation grenade',massKg:.4,spaces:1,
  maxPerOperator:3,locations:['rig','belt','backpack'],usable:false,
  description:'Reserved for the future fragmentation simulation; not yet available to equip.'},
 'door-charge':{id:'door-charge',name:'Door charge',massKg:1.1,spaces:2,
  maxPerOperator:2,locations:['rig','backpack'],usable:false,
  description:'Reserved for physical charge placement and detonation.'},
 'chem-light':{id:'chem-light',name:'Chem light',massKg:.04,spaces:1,
  maxPerOperator:6,locations:['rig','belt','pocket','backpack'],usable:false,
  description:'Reserved for persistent scene marking.'}
};
export type FieldStack={itemId:FieldItemId;quantity:number;location:FieldCarryLocation};
export type FieldInventory={version:1;stacks:FieldStack[]};
export type FieldCarryReport={
 capacity:Record<FieldCarryLocation,number>;
 used:Record<FieldCarryLocation,number>;
 conflicts:readonly string[];
 valid:boolean;
};
const isItem=(value:unknown):value is FieldItemId=>
 typeof value==='string'&&Object.hasOwn(FIELD_ITEMS,value);
const isLocation=(value:unknown):value is FieldCarryLocation=>
 typeof value==='string'&&FIELD_CARRY_LOCATIONS.includes(value as FieldCarryLocation);
const count=(value:unknown,limit:number)=>typeof value==='number'&&Number.isInteger(value)?
 Math.max(0,Math.min(limit,value)):0;
const empty=():FieldInventory=>({version:1,stacks:[]});
/** Migration from legacy one-tactical-item/one-utility-item loadouts.
 * A legacy wedge tool issued two wedges; never infer working smoke/frags
 * from visual/catalog selections that have no simulation implementation.
 */
export function initialFieldInventory(kit:EquipmentLoadout):FieldInventory{
 const stacks:FieldStack[]=[];
 if(kit.slots.tactical==='tactical-flash')
  stacks.push({itemId:'flashbang',quantity:1,location:'rig'});
 if(kit.slots.utility==='utility-wedge')
  stacks.push({itemId:'wedge',quantity:2,location:'belt'});
 return {version:1,stacks};
}
/** Reject malformed or unavailable content; normalize duplicate rows by
 * item+location while enforcing a single per-operator item ceiling. */
export function readFieldInventory(raw:unknown,kit:EquipmentLoadout):FieldInventory{
 if(!raw||typeof raw!=='object'||(raw as {version?:unknown}).version!==1)
  return initialFieldInventory(kit);
 const source=(raw as {stacks?:unknown}).stacks;
 if(!Array.isArray(source))return initialFieldInventory(kit);
 const totals=new Map<FieldItemId,number>();
 const stacks:FieldStack[]=[];
 for(const entry of source.slice(0,64)){
  if(!entry||typeof entry!=='object')continue;
  const row=entry as Record<string,unknown>;
  if(!isItem(row.itemId)||!isLocation(row.location))continue;
  const def=FIELD_ITEMS[row.itemId];
  if(!def.usable||!def.locations.includes(row.location))continue;
  if(row.itemId==='wedge'&&kit.slots.utility!=='utility-wedge')continue;
  const remaining=def.maxPerOperator-(totals.get(row.itemId)??0);
  const quantity=count(row.quantity,Math.max(0,remaining));
  if(quantity===0)continue;
  totals.set(row.itemId,(totals.get(row.itemId)??0)+quantity);
  const existing=stacks.find(item=>item.itemId===row.itemId&&item.location===row.location);
  if(existing)existing.quantity+=quantity;
  else stacks.push({itemId:row.itemId,location:row.location,quantity});
 }
 return {version:1,stacks};
}
export const fieldQuantity=(kit:FieldInventory,id:FieldItemId):number=>
 kit.stacks.reduce((n,s)=>n+(s.itemId===id?s.quantity:0),0);
export function replaceFieldQuantity(
 inventory:FieldInventory,id:FieldItemId,quantity:number,
 location:FieldCarryLocation='rig'):FieldInventory{
 const def=FIELD_ITEMS[id];
 if(!def.usable||!def.locations.includes(location))return inventory;
 const target=count(quantity,def.maxPerOperator);
 const current=fieldQuantity(inventory,id);
 if(current===target)return inventory;
 const stacks=inventory.stacks.filter(s=>s.itemId!==id);
 if(target)stacks.push({itemId:id,quantity:target,location:
  inventory.stacks.find(s=>s.itemId===id)?.location??location});
 return {version:1,stacks};
}
export function moveFieldStack(
 inventory:FieldInventory,id:FieldItemId,from:FieldCarryLocation,
 to:FieldCarryLocation):FieldInventory{
 if(from===to||!FIELD_ITEMS[id].locations.includes(to))return inventory;
 const source=inventory.stacks.find(s=>s.itemId===id&&s.location===from);
 if(!source)return inventory;
 const stacks=inventory.stacks.filter(s=>s!==source).map(s=>({...s}));
 const destination=stacks.find(s=>s.itemId===id&&s.location===to);
 if(destination)destination.quantity+=source.quantity;
 else stacks.push({...source,location:to});
 return {version:1,stacks};
}
/** A loadout's legacy flash/wedge slots are issue permissions/compatibility,
 * not extra phantom copies of the same countable inventory.
 * The existing magazine and medical/tool ledger owns everything else.
 */
export function fieldCarryReport(
 kit:EquipmentLoadout,magazines:readonly MagazineItem[],
 inventory:FieldInventory):FieldCarryReport{
 const capacity=magazineSpace(kit);
 const used:Record<FieldCarryLocation,number>={rig:0,belt:0,pocket:0,backpack:0};
 const conflicts:string[]=[];
 for(const placed of carryPlacementLedger(kit,magazines)){
  // The wedge's two issued pieces are represented by field stacks instead.
  if(placed.id==='utility-wedge')continue;
  if(placed.location==='overflow'){
   conflicts.push(placed.id+' HAS NO FITTED CARRY LOCATION');
   continue;
  }
  used[placed.location]+=placed.spaces;
 }
 const seen=new Map<FieldItemId,number>();
 for(const stack of inventory.stacks){
  const def=FIELD_ITEMS[stack.itemId];
  if(!def?.usable||!def.locations.includes(stack.location)||
    !Number.isInteger(stack.quantity)||stack.quantity<=0){
   conflicts.push('INVALID FIELD ITEM');continue;
  }
  seen.set(stack.itemId,(seen.get(stack.itemId)??0)+stack.quantity);
  used[stack.location]+=stack.quantity*def.spaces;
 }
 for(const [id,total] of seen){
  if(total>FIELD_ITEMS[id].maxPerOperator)conflicts.push(FIELD_ITEMS[id].name+' EXCEEDS ISSUE LIMIT');
  if(id==='wedge'&&kit.slots.utility!=='utility-wedge')
   conflicts.push('WEDGES REQUIRE WEDGE TOOL');
 }
 for(const loc of FIELD_CARRY_LOCATIONS)
  if(used[loc]>capacity[loc])
   conflicts.push(loc.toUpperCase()+' CAPACITY '+used[loc]+'/'+capacity[loc]);
 return {capacity,used,conflicts,valid:conflicts.length===0};
}
export function autoPackFieldInventory(
 kit:EquipmentLoadout,magazines:readonly MagazineItem[],
 inventory:FieldInventory):FieldInventory|null{
 let result=empty();
 const preferred:readonly FieldCarryLocation[]=['rig','belt','pocket','backpack'];
 for(const row of inventory.stacks){
  for(let i=0;i<row.quantity;i++){
   let placed=false;
   for(const location of preferred){
    if(!FIELD_ITEMS[row.itemId].locations.includes(location))continue;
    const candidate=moveOrAdd(result,row.itemId,location);
    if(fieldCarryReport(kit,magazines,candidate).valid){result=candidate;placed=true;break;}
   }
   if(!placed)return null;
  }
 }
 return result;
}
function moveOrAdd(inventory:FieldInventory,id:FieldItemId,
 location:FieldCarryLocation):FieldInventory{
 const stacks=inventory.stacks.map(s=>({...s}));
 const current=stacks.find(s=>s.itemId===id&&s.location===location);
 if(current)current.quantity++;
 else stacks.push({itemId:id,location,quantity:1});
 return {version:1,stacks};
}
export const fieldInventoryMass=(inventory:FieldInventory):number=>
 inventory.stacks.reduce((sum,row)=>sum+
  (FIELD_ITEMS[row.itemId]?.massKg??0)*row.quantity,0);

/** L2.6: quote a physical gadget-only copy before mutating the destination.
 * This is intentionally NOT a full loadout/weapon transfer. There is no
 * silent omission of an incompatible item or phantom campaign stock.
 */
export function quoteFieldInventoryCopy(source:FieldInventory,
 targetKit:EquipmentLoadout,targetMagazines:readonly MagazineItem[]):
 {ok:true;inventory:FieldInventory}|{ok:false;reason:string}{
 const requested=readFieldInventory(source,targetKit);
 for(const id of FIELD_ITEM_IDS){
  if(fieldQuantity(requested,id)!==fieldQuantity(source,id))
   return {ok:false,reason:FIELD_ITEMS[id].name+' cannot be carried with this equipment'};
 }
 if(fieldCarryReport(targetKit,targetMagazines,requested).valid)
  return {ok:true,inventory:requested};
 const packed=autoPackFieldInventory(targetKit,targetMagazines,requested);
 if(packed&&fieldCarryReport(targetKit,targetMagazines,packed).valid)
  return {ok:true,inventory:packed};
 return {ok:false,reason:'Not enough free carrying capacity on the destination operator'};
}
