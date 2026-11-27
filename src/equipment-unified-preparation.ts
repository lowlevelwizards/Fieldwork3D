/** BT4.12: headless, atomic preparation quote. The host owns authorization,
 * stock, campaign phase, and the commit. This adapter never changes issue
 * quantity or creates rounds; it only fits already-authorized candidate kit. */
import type {MagazineItem} from './breach-magazines.ts';
import type {WeaponId} from './breach-combat.ts';
import type {EquipmentLoadout,LoadoutSlot} from './equipment-loadouts.ts';
import {setEquipmentChoice} from './equipment-loadouts.ts';
import {readFieldInventory,initialFieldInventory,FIELD_ITEM_IDS,fieldQuantity,type FieldInventory} from './equipment-field-inventory.ts';
import type {WardrobeOptions} from './operator-wardrobe-data.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {quoteUnifiedCarryTransaction} from './equipment-unified-loadout.ts';
import {fixedWaistSlots,type Carrier} from './equipment-fixed-carrier-slots.ts';
import type {PlacementManifest,CarryInput} from './equipment-unified-placement.ts';
export type UnifiedPreparationSource={loadout:EquipmentLoadout;magazines:readonly MagazineItem[];
 wardrobe?:WardrobeOptions;weapon:WeaponId;weaponConfiguration?:WeaponConfiguration;reserve:number};
export type UnifiedPreparationRequest={kind:'gear';slot:LoadoutSlot;id:string}|
 {kind:'field';inventory:FieldInventory}|{kind:'refit'};
export type UnifiedPreparationResult={ok:false;reason:string;manifest?:PlacementManifest}|
 {ok:true;kit:EquipmentLoadout;magazines:MagazineItem[];manifest:PlacementManifest;input:CarryInput};
export function quoteUnifiedPreparation(source:UnifiedPreparationSource,request:UnifiedPreparationRequest):UnifiedPreparationResult{
 let kit=source.loadout;
 if(request.kind==='gear'){
  if(request.slot==='primary')return {ok:false,reason:'WEAPON ISSUE REQUIRES ITS OWN STOCK AUTHORITY'};
  kit=setEquipmentChoice(kit,request.slot,request.id);
  if(kit===source.loadout&&kit.slots[request.slot]!==request.id)return {ok:false,reason:'INCOMPATIBLE EQUIPMENT CHANGE'};
 }else if(request.kind==='field'){
  const inventory=readFieldInventory(request.inventory,kit);
  if(FIELD_ITEM_IDS.some(id=>fieldQuantity(inventory,id)!==fieldQuantity(request.inventory,id)))return {ok:false,reason:'INVALID FIELD ISSUE'};
  kit={...kit,fieldInventory:inventory};
 }
 const quote=quoteUnifiedCarryTransaction({kit,wardrobe:source.wardrobe,magazines:source.magazines,
  primaryPart:source.weaponConfiguration?.build?.parts.magazine,shellReserve:source.weapon==='shotgun'?source.reserve:undefined});
 if(!quote.ok)return quote;
 const old=source.magazines;
 if(quote.magazines.length!==old.length||quote.magazines.some(m=>!old.some(p=>p.id===m.id&&p.weapon===m.weapon&&p.rounds===m.rounds)))
  return {ok:false,reason:'MAGAZINE CONSERVATION FAILURE'};
 const expected=kit.fieldInventory??initialFieldInventory(kit),actual=quote.kit.fieldInventory!;
 if(FIELD_ITEM_IDS.some(id=>fieldQuantity(expected,id)!==fieldQuantity(actual,id)))return {ok:false,reason:'FIELD CONSERVATION FAILURE'};
 const before=kit.secondary,after=quote.kit.secondary;
 if(before?.weapon&&(!after||before.loadedMagazineId!==after.loadedMagazineId||before.loadedRounds!==after.loadedRounds||
  before.spareMagazines.length!==after.spareMagazines.length||before.spareMagazines.some(m=>!after.spareMagazines.some(n=>n.id===m.id&&n.rounds===m.rounds))))
  return {ok:false,reason:'SECONDARY CONSERVATION FAILURE'};
 return quote;
}
/** Accurate status for the simplified preparation UI. Armor alternatives
 * are mutually exclusive (wide or two narrow); never add all three.
 * Counts represent physical reservation positions, not item quantities. */
export function unifiedPreparationSummary(input:CarryInput,manifest:PlacementManifest){
 const carriers:Carrier[]=['rig','armor','belt','pocket','backpack'];
 return carriers.map(carrier=>{
  const slots=carrier==='belt'?fixedWaistSlots(input.belt,input.holsterSide,input.historicalWaist).map(s=>s.id):
   input.storage.filter(s=>s.carrier===carrier&&!s.conflicts?.length).map(s=>s.id);
  const used=new Set(manifest.placements.filter(p=>p.carrier===carrier).flatMap(p=>p.slotIds).filter(id=>slots.includes(id)));
  return {carrier,used:used.size,total:slots.length,items:manifest.placements.filter(p=>p.carrier===carrier).reduce((n,p)=>n+p.itemIds.length,0)};
 });
}

/** Saved V1 locations are hints, not a second authority. Refit the existing
 * stock as a single transaction without replacing the save or minting ammo.
 * Keep the original operator intact on failure, with a specific diagnostic.
 * Successful output remains in the V1 save shape; runtime manifests are
 * reconstructed at deployment rather than trusting persisted slot claims. */
export function quoteSavedCarryMigration<T extends UnifiedPreparationSource>(source:T):
 {ok:true;operator:T;manifest:PlacementManifest;input:CarryInput}|{ok:false;reason:string;manifest?:PlacementManifest}{
 const q=quoteUnifiedPreparation(source,{kind:'refit'});
 if(!q.ok)return q;
 return {ok:true,operator:{...source,loadout:q.kit,magazines:q.magazines},manifest:q.manifest,input:q.input};
}
export function quoteSavedSquadCarryMigration<T extends UnifiedPreparationSource&{id:string}>(members:readonly T[]){
 const migrated:T[]=[],failures:{id:string;reason:string}[]=[];
 for(const member of members){
  const q=quoteSavedCarryMigration(member);
  if(q.ok)migrated.push(q.operator);else failures.push({id:member.id,reason:q.reason});
 }
 // Never partly activate a squad, and never silently reduce its issue.
 return failures.length?{ok:false as const,failures}:{ok:true as const,members:migrated};
}

/** Copy quantities only, never a donor's physical locations or magazine IDs.
 * Destination ownership and campaign stock checks remain with its owner. */
export function quoteUnifiedFieldCopy(source:EquipmentLoadout,target:UnifiedPreparationSource){
 const inventory=source.fieldInventory??initialFieldInventory(source);
 return quoteUnifiedPreparation(target,{kind:'field',inventory:structuredClone(inventory)});
}
