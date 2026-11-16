/** FT1.3B. Explicit, validated game mappings; an art proxy is not an issued gun.
 * Never mint owned equipment or create weapon/ammo inventory here.
 */
import {validEquipmentChoice,type EquipmentSlot} from './equipment-catalog.ts';
import {familyPreset} from './equipment-weapon-families.ts';
import {isHeadwearCamoId} from './operator-headwear-camo.ts';
import {initialWardrobe,setWardrobeStyle,type WardrobeSlot}
 from './operator-wardrobe-data.ts';
import type {HistoricalEquipment} from './faction-reference-historical-equipment.ts';
export type HistoricalGameMapping={
 channel:'uniform'|'headwear'|'armor'|'weapon';
 fidelity:'exact'|'representative'|'proxy';
 wardrobeSlot?:WardrobeSlot;gameSlot?:EquipmentSlot;gameItemId?:string;
 value:string;note:string;playable:boolean;
};
export function gameMappingForHistorical(equipment:HistoricalEquipment):
 HistoricalGameMapping|null{
 const model=equipment.model;
 if(!model)return null;
 if(model.kind==='camouflage'&&equipment.category==='uniform'){
  if(!isHeadwearCamoId(model.id))return null;
  return {channel:'uniform',fidelity:model.fidelity,value:model.id,
   note:model.note,playable:true};
 }
 if(model.kind==='weapon-preset'&&equipment.category==='weapon'){
  const preset=familyPreset(model.id);
  if(!preset)return null;
  // A gun of another family must not be issued as this historical identity.
  return {channel:'weapon',fidelity:model.fidelity,value:model.id,
   gameSlot:'primary',gameItemId:'primary-'+preset.weapon,
   note:model.note,playable:model.fidelity!=='proxy'};
 }
 if(model.kind==='wardrobe-style'&&
  (equipment.category==='headwear'||equipment.category==='armor')){
  const wardrobeSlot:WardrobeSlot=equipment.category==='headwear'?'headwear':'armorStyle';
  const gameItemId=equipment.category==='headwear'?'head-helmet':'armor-carrier';
  const gameSlot:EquipmentSlot=equipment.category==='headwear'?'head':'armor';
  if(!validEquipmentChoice(gameSlot,gameItemId))return null;
  const original=initialWardrobe();
  if(setWardrobeStyle(original,wardrobeSlot,model.id)===original)return null;
  return {channel:equipment.category==='headwear'?'headwear':'armor',
   fidelity:model.fidelity,wardrobeSlot,gameSlot,gameItemId,
   value:model.id,note:model.note,playable:true};
 }
 // Carriage, accessories and any unmapped identity stay historical-only.
 return null;
}
export function auditHistoricalGameMappings(equipment:readonly HistoricalEquipment[]){
 const issues:{id:string;reason:string}[]=[];
 for(const item of equipment){
  if(item.model&&!gameMappingForHistorical(item))
   issues.push({id:item.id,reason:'Mapping cannot resolve in current game catalog'});
 }
 return issues;
}
