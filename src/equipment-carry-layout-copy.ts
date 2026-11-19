/** L2.12E2A: copy the arrangement of existing carried equipment, not stock.
 * Target retains its own rig/pack, magazine IDs, rounds, weapon, medical and
 * tool authority. An incompatible layout fails instead of silently repacking.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {stageMagazines} from './equipment-magazine-placement.ts';
import {carryPlacementLedger} from './equipment-carry-placement.ts';
import {FIELD_ITEM_IDS,fieldQuantity,fieldCarryReport,readFieldInventory,
 initialFieldInventory,type FieldInventory} from './equipment-field-inventory.ts';
export type CarryLayoutMove={kind:'magazine'|'field';label:string;from:string;to:string;quantity:number};
export type CarryLayoutQuote=
 |{ok:true;changed:boolean;loadout:EquipmentLoadout;magazines:MagazineItem[];
   moves:readonly CarryLayoutMove[]}
 |{ok:false;reason:string};
export function quoteCarryLayoutCopy(
 sourceKit:EquipmentLoadout,sourceMags:readonly MagazineItem[],
 destinationKit:EquipmentLoadout,destinationMags:readonly MagazineItem[]
):CarryLayoutQuote{
 const sourceField=sourceKit.fieldInventory??initialFieldInventory(sourceKit);
 const destinationField=destinationKit.fieldInventory??initialFieldInventory(destinationKit);
 for(const id of FIELD_ITEM_IDS){
  if(fieldQuantity(sourceField,id)!==fieldQuantity(destinationField,id))
   return {ok:false,reason:'TARGET HAS DIFFERENT '+id.toUpperCase()+' COUNT'};
 }
 const source=stageMagazines(sourceMags,sourceKit);
 const dest=stageMagazines(destinationMags,destinationKit);
 if(source.length!==dest.length)
  return {ok:false,reason:'MAGAZINE COUNT DOES NOT MATCH'};
 if(source.some((m,i)=>m.weapon!==dest[i].weapon))
  return {ok:false,reason:'MAGAZINE WEAPON MIX DOES NOT MATCH'};
 const proposed=dest.map((m,i)=>({...m,location:source[i].location}));
 const placed=stageMagazines(proposed,destinationKit);
 if(placed.some((m,i)=>m.location!==source[i].location))
  return {ok:false,reason:'DESTINATION CARRIERS CANNOT HOLD MAGAZINE LAYOUT'};
 // This is only a placement copy. The target has exactly as many physical
 // pieces as before and keeps its own magazine and medical/tool identities.
 const copy:FieldInventory=readFieldInventory(
  {version:1,stacks:sourceField.stacks.map(s=>({...s}))},destinationKit);
 for(const id of FIELD_ITEM_IDS)
  if(fieldQuantity(copy,id)!==fieldQuantity(destinationField,id))
   return {ok:false,reason:'TARGET CANNOT EQUIP SOURCE '+id.toUpperCase()+' LOCATIONS'};
 const report=fieldCarryReport(destinationKit,placed,copy);
 if(!report.valid)return {ok:false,reason:report.conflicts.join(' · ')};
 const beforeGear=carryPlacementLedger(destinationKit,destinationMags)
  .filter(p=>p.kind==='medical'||p.kind==='utility');
 const afterGear=carryPlacementLedger(destinationKit,placed)
  .filter(p=>p.kind==='medical'||p.kind==='utility');
 if(beforeGear.some(p=>afterGear.find(q=>q.kind===p.kind&&q.id===p.id)
  ?.location!==p.location))
  return {ok:false,reason:'LAYOUT WOULD MOVE EXISTING MEDICAL OR BREACH TOOLS'};
 const moves:CarryLayoutMove[]=[];
 for(let i=0;i<dest.length;i++)
  if(dest[i].location!==placed[i].location)
   moves.push({kind:'magazine',label:dest[i].id,from:dest[i].location,
    to:placed[i].location,quantity:1});
 for(const id of FIELD_ITEM_IDS){
  // Source and target quantities match. Pair nonmatching source/target unit
  // locations deterministically, preserving the exact physical piece total.
  const previous=destinationField.stacks.filter(s=>s.itemId===id)
   .flatMap(s=>Array(s.quantity).fill(s.location) as string[]);
  const next=copy.stacks.filter(s=>s.itemId===id)
   .flatMap(s=>Array(s.quantity).fill(s.location) as string[]);
  const counts=new Map<string,number>();
  for(const at of next)counts.set(at,(counts.get(at)??0)+1);
  const removed:string[]=[];
  for(const at of previous){
   if((counts.get(at)??0)>0)counts.set(at,counts.get(at)!-1);
   else removed.push(at);
  }
  const added=Array.from(counts.entries())
   .flatMap(([at,count])=>Array(count).fill(at) as string[]);
  for(let i=0;i<removed.length;i++)
   moves.push({kind:'field',label:id,from:removed[i],to:added[i],quantity:1});
 }
 const loadout:EquipmentLoadout={...destinationKit,fieldInventory:copy};
 return {ok:true,changed:moves.length>0,loadout,magazines:placed,moves};
}
