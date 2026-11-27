/** BT4.6–10 staged deployment bridge. Physical reservations are the
 * location authority for opted-in deployments; the existing actor counters
 * and magazine records remain the only stock authority. No implicit opt-in
 * and no legacy fallback after a unified deployment has been accepted. */
import {equipmentRetrievalSeconds} from './equipment-carry-placement.ts';
import {initialEquipmentLoadout} from './equipment-loadouts.ts';
import type {TeamActor} from './breach-game.ts';
import type {MagazineLocation} from './equipment-magazine-placement.ts';
import {FIELD_ITEMS,fieldQuantity,type FieldCarryLocation,type FieldInventory,type FieldItemId}
 from './equipment-field-inventory.ts';
import {CARRY_PRIORITY,quoteManifestRetrieval,quoteManifestReturn,removeManifestContent,
 type CarryInput,type PlacementManifest} from './equipment-unified-placement.ts';
import type {Carrier,CarryKind} from './equipment-fixed-carrier-slots.ts';
export type UnifiedDeployedCarry={input:CarryInput;manifest:PlacementManifest};
export const legacyCarrier=(carrier:Carrier):Exclude<MagazineLocation,'overflow'>=>carrier==='armor'?'rig':carrier;
export type DeployedCarryActor=Pick<TeamActor,'unifiedCarry'|'equipment'|'spareMagazines'>;
export function deployedCarryLocation(actor:DeployedCarryActor,id:string){
 const state=actor.unifiedCarry;
 const retrieval=state?quoteManifestRetrieval(state.manifest,id):null;
 return retrieval?{...retrieval,location:legacyCarrier(retrieval.placement.carrier)}:null;
}
export function consumeUnifiedContent(actor:DeployedCarryActor,id:string):boolean{
 const state=actor.unifiedCarry;if(!state||!quoteManifestRetrieval(state.manifest,id))return false;
 actor.unifiedCarry={...state,manifest:removeManifestContent(state.manifest,id)};return true;
}
/** Keep per-item field IDs stable through a mission. A field stack is a
 * legacy projection, not a different placement policy. */
export function quoteUnifiedFieldContent(state:UnifiedDeployedCarry,id:FieldItemId,inventory:FieldInventory){
 const prefix='field:'+id+':',kind:CarryKind=id==='wedge'?'wedge':'flash';
 const preferred=CARRY_PRIORITY[kind];
 const candidates=state.manifest.placements.flatMap(p=>p.itemIds.filter(i=>i.startsWith(prefix)).map(i=>({
  id:i,carrier:p.carrier,location:legacyCarrier(p.carrier),slot:p.slotIds[0]
 }))).filter(c=>FIELD_ITEMS[id].locations.includes(c.location)&&
  inventory.stacks.some(s=>s.itemId===id&&s.location===c.location&&s.quantity>0));
 candidates.sort((a,b)=>preferred.indexOf(a.carrier)-preferred.indexOf(b.carrier)||
  (a.slot<b.slot?-1:a.slot>b.slot?1:0)||(a.id<b.id?-1:a.id>b.id?1:0));
 const candidate=candidates[0];if(!candidate)return null;
 const q=quoteManifestRetrieval(state.manifest,candidate.id);
 return q?{...q,id:candidate.id,location:candidate.location}:null;
}
export function quoteUnifiedWedgeReturn(state:UnifiedDeployedCarry,inventory:FieldInventory){
 const maximum=FIELD_ITEMS.wedge.maxPerOperator;
 if(fieldQuantity(inventory,'wedge')>=maximum)return null;
 const owned=new Set(state.manifest.placements.flatMap(p=>p.itemIds));
 const id=Array.from({length:maximum},(_,i)=>'field:wedge:'+i).find(i=>!owned.has(i));
 if(!id)return null;
 const template=state.input.items.find(i=>i.kind==='wedge');
 const item=template?{...template,id}:{id,kind:'wedge' as const,dimensions:{width:1.2,height:2.8,depth:1},units:1};
 const manifest=quoteManifestReturn(state.manifest,item,state.input);
 if(!manifest)return null;
 const q=quoteManifestRetrieval(manifest,id);if(!q)return null;
 const location=legacyCarrier(q.placement.carrier);
 if(!FIELD_ITEMS.wedge.locations.includes(location))return null;
 return {manifest,location,id};
}
/** Campaign may reduce issue before GO. Keep the exact locations retained
 * by the existing stack allocation; clear other content cells, not holders. */
export function reconcileUnifiedFieldLimit(state:UnifiedDeployedCarry,id:FieldItemId,inventory:FieldInventory):UnifiedDeployedCarry{
 const remaining:Record<FieldCarryLocation,number>={rig:0,belt:0,pocket:0,backpack:0};
 for(const row of inventory.stacks)if(row.itemId===id)remaining[row.location]+=row.quantity;
 let manifest=state.manifest;
 for(const p of state.manifest.placements)for(const item of p.itemIds){
  if(!item.startsWith('field:'+id+':'))continue;
  const loc=legacyCarrier(p.carrier);
  if(remaining[loc]>0)remaining[loc]--;else manifest=removeManifestContent(manifest,item);
 }
 return {...state,manifest};
}
/** Atomic secondary insertion uses the exact cell vacated by the incoming
 * magazine. Only existing serials can be exchanged by the stock owner. */
export function exchangeUnifiedMagazine(state:UnifiedDeployedCarry,incoming:string,outgoing:string|null):UnifiedDeployedCarry|null{
 const q=quoteManifestRetrieval(state.manifest,incoming);
 if(!q||!['primary-mag','secondary-mag'].includes(q.placement.kind??''))return null;
 if(outgoing&&state.manifest.placements.some(p=>p.itemIds.includes(outgoing)))return null;
 const placements=state.manifest.placements.map(p=>{
  if(p!==q.placement)return p;
  const content=[...p.contentIds??p.itemIds];content[q.cell]=outgoing;
  return {...p,contentIds:content,itemIds:content.filter((v):v is string=>v!==null)};
 });
 return {...state,manifest:{...state.manifest,placements}};
}

/** Select from carried primary magazines only, with stable serial ties.
 * Legacy reserve repair must not synthesize an item for a unified actor. */
export function unifiedPrimaryReloadIndex(actor:DeployedCarryActor){
 let index=-1,access=Infinity,rounds=-1;
 for(let i=0;i<actor.spareMagazines.length;i++){
  const mag=actor.spareMagazines[i],q=deployedCarryLocation(actor,mag.id);
  if(mag.rounds<=0||q?.placement.kind!=='primary-mag')continue;
  if(q.accessSeconds<access||q.accessSeconds===access&&(mag.rounds>rounds||
   mag.rounds===rounds&&mag.id<actor.spareMagazines[index]?.id)){
   index=i;access=q.accessSeconds;rounds=mag.rounds;
  }
 }
 return index;
}
/** Exact shell IDs are a physical projection of the original reserve count.
 * Consume only existing cells, with the fastest accessible storage first. */
export function consumeUnifiedShells(actor:DeployedCarryActor,count:number):number{
 const state=actor.unifiedCarry;if(!state)return 0;
 const candidates=state.manifest.placements.flatMap(p=>p.kind==='shell'?p.itemIds:[])
  .map(id=>({id,q:quoteManifestRetrieval(state.manifest,id)!}))
  .sort((a,b)=>a.q.accessSeconds-b.q.accessSeconds||(a.id<b.id?-1:a.id>b.id?1:0));
 let manifest=state.manifest,spent=0;
 for(const item of candidates.slice(0,Math.max(0,Math.floor(count)))){
  manifest=removeManifestContent(manifest,item.id);spent++;
 }
 if(spent)actor.unifiedCarry={...state,manifest};
 return spent;
}
export function unifiedShellAccess(actor:DeployedCarryActor):number{
 const state=actor.unifiedCarry;if(!state)return Infinity;
 return Math.min(Infinity,...state.manifest.placements.flatMap(p=>p.kind==='shell'?
  p.itemIds.map(id=>quoteManifestRetrieval(state.manifest,id)?.accessSeconds??Infinity):[]));
}
/** A medical kit is a persistent holder, while the existing medical supply
 * record owns depletion. No per-treatment recreation of the kit. */
export function deployedEquipmentAccess(actor:DeployedCarryActor&Pick<TeamActor,'weapon'>,kind:'medical'|'utility'){
 if(actor.unifiedCarry)return deployedCarryLocation(actor,'kit:'+kind)?.accessSeconds??Infinity;
 return equipmentRetrievalSeconds(actor.equipment??initialEquipmentLoadout(actor.weapon),actor.spareMagazines,kind);
}
export function unifiedSecondaryAccess(actor:DeployedCarryActor):((id:string)=>number)|undefined{
 return actor.unifiedCarry?(id:string)=>{
  const q=deployedCarryLocation(actor,id);
  return q?.placement.kind==='secondary-mag'?q.accessSeconds:Infinity;
 }:undefined;
}
