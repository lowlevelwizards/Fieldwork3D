/** L2.13 F5.2 — finite HQ stock authority for non-flash field pieces.
 *
 * Campaign's saved operator loadout is the only actual carried inventory.
 * A restock layout is merely a player-authored desired *future placement*
 * (never spendable stock). Campaign's supplies own the unissued wedge/cuff
 * reserve, just as the existing ammo and medical resources do.
 *
 * A move between pouches costs zero; a removed item is returned to HQ;
 * every newly equipped physical piece debits exactly one HQ unit.
 */
import type {CampaignState,CampaignOperator} from './campaign-state.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {FIELD_ITEMS,FIELD_CARRY_LOCATIONS,fieldQuantity,initialFieldInventory,
 fieldCarryReport,readFieldInventory,type FieldInventory,type FieldItemId,
 type FieldCarryLocation} from './equipment-field-inventory.ts';

export const FIELD_STOCK_LIMIT=1000;
export const FIELD_STOCK_PACKS={
 wedges:{quantity:4,price:100,name:'4 DOOR WEDGES'},
 cuffs:{quantity:6,price:90,name:'6 FLEX CUFF PAIRS'}
} as const;
export type FieldStockKey='wedges'|'cuffs';
export type FieldStockQuote=
 |{ok:true;stock:CampaignState['supplies'];wedgesIssued:number;cuffsIssued:number;
   wedgesReturned:number;cuffsReturned:number}
 |{ok:false;reason:string};

const inventory=(kit:EquipmentLoadout)=>
 kit.fieldInventory??initialFieldInventory(kit);
const count=(kit:EquipmentLoadout,id:FieldItemId)=>
 fieldQuantity(inventory(kit),id);
const integer=(x:number)=>Number.isInteger(x)&&x>=0;
// Restraint is a universal operator action. Keep the persisted HQ cuffs
// field for old saves, but never issue, spend or restock it again.
const ids=[['wedge','wedges']] as const;

/** Net stock changes are one atomic transaction, never two sequential ones.
 * Both acquisition AND return routes must use this same quote.
 */
export function quoteCampaignFieldStockChange(c:CampaignState,
 before:EquipmentLoadout,after:EquipmentLoadout):FieldStockQuote{
 const stock={...c.supplies};
 let wedgesIssued=0,cuffsIssued=0,wedgesReturned=0,cuffsReturned=0;
 for(const [id,key] of ids){
  const previous=count(before,id),desired=count(after,id);
  const delta=desired-previous,current=stock[key];
  if(!integer(current)||current>FIELD_STOCK_LIMIT)
   return {ok:false,reason:'INVALID HQ '+key.toUpperCase()+' STOCK'};
  if(delta>current)return {ok:false,reason:'INSUFFICIENT HQ '+key.toUpperCase()};
  if(current-delta>FIELD_STOCK_LIMIT)
   return {ok:false,reason:'HQ '+key.toUpperCase()+' STOCK FULL'};
  stock[key]=current-delta;
  if(key==='wedges'){
   wedgesIssued=Math.max(0,delta);wedgesReturned=Math.max(0,-delta);
  }else{
   cuffsIssued=Math.max(0,delta);cuffsReturned=Math.max(0,-delta);
  }
 }
 return {ok:true,stock,wedgesIssued,cuffsIssued,
  wedgesReturned,cuffsReturned};
}

export function fieldRestockPreference(kit:EquipmentLoadout):FieldInventory{
 const value=inventory(kit);
 return {version:1,stacks:value.stacks.map(item=>({...item}))};
}
export function sanitizedFieldRestockPreference(
 raw:unknown,kit:EquipmentLoadout):FieldInventory|undefined{
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
  (raw as FieldInventory).version!==1||
  !Array.isArray((raw as FieldInventory).stacks))return undefined;
 const parsed=readFieldInventory(raw,kit);
 // A future intended placement is subject to all physical/capacity checks
 // when it is issued, not to historical current magazine availability.
 return {version:1,stacks:parsed.stacks.map(item=>({...item}))};
}

export type FieldRefillQuote={
 result:CampaignState;
 wedgesWanted:number;wedgesIssued:number;wedgesShort:number;
 cuffsWanted:number;cuffsIssued:number;cuffsShort:number;
 /** Insufficient pouch capacity can block an issue even with HQ stock. */
 blockedByCarry:boolean;
};
function desiredLocations(target:FieldInventory,
 id:FieldItemId):FieldCarryLocation[]{
 const preferred:FieldCarryLocation[]=[];
 for(const row of target.stacks){
  if(row.itemId!==id)continue;
  for(let n=0;n<row.quantity;n++)preferred.push(row.location);
 }
 return preferred;
}
function addOne(kit:EquipmentLoadout,
 magazines:CampaignOperator['magazines'],existing:FieldInventory,
 id:FieldItemId,where:FieldCarryLocation):FieldInventory|null{
 const candidate:FieldInventory={version:1,stacks:existing.stacks.map(s=>({...s}))};
 const row=candidate.stacks.find(s=>s.itemId===id&&s.location===where);
 if(row)row.quantity++;
 else candidate.stacks.push({itemId:id,quantity:1,location:where});
 return fieldCarryReport(kit,magazines,candidate).valid?candidate:null;
}
/** Only restores an explicitly remembered/issued layout. Old saves without a
 * prior issued preference are not assigned speculative restraints or wedges.
 */
export function replenishCampaignFieldPieces(c:CampaignState,id:string):FieldRefillQuote{
 const member=c.operators.find(o=>o.id===id&&
  o.status!=='lost'&&o.status!=='retired');
 const noChange=()=>({result:c,wedgesWanted:0,wedgesIssued:0,wedgesShort:0,
  cuffsWanted:0,cuffsIssued:0,cuffsShort:0,blockedByCarry:false});
 if(!member||c.activeContractId)return noChange();
 const target=member.fieldRestockLayout??fieldRestockPreference(member.loadout);
 let next=inventory(member.loadout);
 let stock={...c.supplies};
 let wedgesWanted=0,cuffsWanted=0,wedgesIssued=0,cuffsIssued=0;
 let blockedByCarry=false;
 for(const [kind,key] of ids){
  const current=fieldQuantity(next,kind);
  const locations=desiredLocations(target,kind);
  const wanted=Math.max(0,locations.length-current);
  if(key==='wedges')wedgesWanted=wanted;else cuffsWanted=wanted;
  for(let i=0;i<wanted&&stock[key]>0;i++){
   const best=locations[Math.min(current+i,locations.length-1)];
   const choices=[best,...FIELD_CARRY_LOCATIONS].filter((loc,j,arr)=>
    arr.indexOf(loc)===j&&FIELD_ITEMS[kind].locations.includes(loc));
   let placed:FieldInventory|null=null;
   for(const location of choices){
    placed=addOne(member.loadout,member.magazines,next,kind,location);
    if(placed)break;
   }
   if(!placed){blockedByCarry=true;break;}
   next=placed;
   stock={...stock,[key]:stock[key]-1};
   if(key==='wedges')wedgesIssued++;else cuffsIssued++;
  }
 }
 if(wedgesIssued===0&&cuffsIssued===0)
  return {result:c,wedgesWanted,wedgesIssued,wedgesShort:wedgesWanted,
   cuffsWanted,cuffsIssued,cuffsShort:cuffsWanted,blockedByCarry};
 const updated:CampaignState={...c,supplies:stock,
  operators:c.operators.map(o=>o.id===id?{...o,loadout:{
   ...o.loadout,fieldInventory:next}}:o)};
 return {result:updated,wedgesWanted,wedgesIssued,
  wedgesShort:wedgesWanted-wedgesIssued,
  cuffsWanted,cuffsIssued,cuffsShort:cuffsWanted-cuffsIssued,
  blockedByCarry};
}
