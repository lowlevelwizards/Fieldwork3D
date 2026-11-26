/** Typed gallery choices shared by Quick Play and Campaign.
 * Campaign's existing HTMLSelectElement implements OutfitterChoiceSource
 * structurally; Quick Play should not create invisible DOM controls to
 * provide the same read-only information.
 * Availability is a view projection; roster/campaign mutations remain owned
 * by their existing equipment authorities.
 */
import {itemsForSlot,LOADOUT_SLOTS} from '../equipment-catalog.ts';
import type {EquipmentLoadout,LoadoutSlot} from '../equipment-loadouts.ts';
import type {WeaponConfiguration} from '../equipment-weapon-assemblies.ts';
import type {EquipmentThumbnailTarget} from '../equipment-preview.ts';
import {FAMILY_PRESETS,FAMILY_PARTS,matchingFamilyPreset,familyPreset} from '../equipment-weapon-families.ts';
import {issueWeaponPreset} from '../breach-weapon-issue.ts';

export type OutfitterChoiceOption=Readonly<{value:string;disabled:boolean;dataset?:{catalogName?:string;catalogDetail?:string}}>;
export type OutfitterChoiceSource=Readonly<{
 value:string;
 options:Iterable<OutfitterChoiceOption>;
}>;

export function rosterCatalogName(config:WeaponConfiguration):string{
 const body=config.build;
 return body?(matchingFamilyPreset(body)?.name??((FAMILY_PARTS[body.parts.receiver]?.name??body.family.toUpperCase())+' · CUSTOM')):'Current weapon';
}
const currentCatalogId=(config:WeaponConfiguration)=>config.build?matchingFamilyPreset(config.build)?.id??'catalog-current':'catalog-current';
export function catalogOutfitterThumbnailTarget(kit:EquipmentLoadout,config:WeaponConfiguration,
 slot:LoadoutSlot,itemId:string):EquipmentThumbnailTarget{
 if(slot!=='primary')return {kind:'gear',slot,itemId};
 if(itemId===currentCatalogId(config))return {kind:'gear',slot,itemId:kit.slots.primary};
 const preset=familyPreset(itemId);
 return preset?{kind:'gear',slot,itemId:'primary-'+preset.weapon,weaponConfiguration:issueWeaponPreset(preset.id).weaponConfiguration}:
  {kind:'gear',slot,itemId:'primary-none'};
}
export function catalogOutfitterSources(
 kit:EquipmentLoadout,config:WeaponConfiguration
):Map<LoadoutSlot,OutfitterChoiceSource>{
 const sources=new Map<LoadoutSlot,OutfitterChoiceSource>();
 for(const slot of LOADOUT_SLOTS){
  if(slot==='tactical')continue; // Physical consumables have their own editor.
  if(slot==='primary'){
   const value=currentCatalogId(config);
   const options:OutfitterChoiceOption[]=FAMILY_PRESETS.map(p=>({value:p.id,disabled:false,
    dataset:{catalogName:p.name,catalogDetail:'AVAILABLE'}}));
   if(value==='catalog-current')options.unshift({value,disabled:false,dataset:{catalogName:rosterCatalogName(config)}});
   sources.set(slot,{value,options});continue;
  }
  sources.set(slot,{
   value:kit.slots[slot],
   options:itemsForSlot(slot).map(item=>({value:item.id,disabled:false}))
  });
 }
 return sources;
}
