/** Arsenal 2.0 Stage 1: one read-only, renderer-free browsing catalog.
 * This is an adapter over existing art and gameplay IDs, NOT a save migration.
 * 'hk' is an art family, not a single universal compatibility platform.
 */
import {FAMILY_PARTS,FAMILY_PRESETS,
 type FamilyPartSlot,type WeaponFamilyPart,type WeaponFamilyPreset}
 from '../equipment-weapon-families.ts';
import {WEAPON_ATTACHMENTS,
 type WeaponAttachmentSlot,type WeaponAttachment}
 from '../equipment-weapon-assemblies.ts';
import {arsenalPartName} from './naming.ts';

export type ArsenalPlatformId='ar15'|'ak'|'g3'|'hk33'|'mp5';
export type ArsenalSlot=FamilyPartSlot|Exclude<WeaponAttachmentSlot,'stock'>;
export type ArsenalCategoryId='core'|'front'|'furniture'|'magazine'|'sights'|'muzzle'|'accessories';
export type ArsenalPartKind='family'|'accessory';
export type ArsenalBrowseGroup='ar'|'ak'|'hk';
export interface ArsenalPlatform{
 id:ArsenalPlatformId;name:string;group:ArsenalBrowseGroup;
}
export interface ArsenalCategory{
 id:ArsenalCategoryId;name:string;slots:readonly ArsenalSlot[];
}
export interface ArsenalPart{
 id:string;slot:ArsenalSlot;name:string;detail:string;kind:ArsenalPartKind;
}
export interface ArsenalReference{
 id:string;name:string;platformId:ArsenalPlatformId;
 legacy:WeaponFamilyPreset;
 identitySlots:readonly FamilyPartSlot[];
}
/** These are browsing identities; actual compatibility is validated per component. */
export const ARSENAL_PLATFORMS:readonly ArsenalPlatform[]=[
 {id:'ar15',name:'AR-15',group:'ar'},
 {id:'ak',name:'AK',group:'ak'},
 {id:'g3',name:'G3',group:'hk'},
 {id:'hk33',name:'HK33 / HK53',group:'hk'},
 {id:'mp5',name:'MP5',group:'hk'}
];
export const ARSENAL_CATEGORIES:readonly ArsenalCategory[]=[
 {id:'core',name:'Receiver',slots:['receiver']},
 {id:'front',name:'Front End',slots:['barrel','handguard']},
 {id:'furniture',name:'Furniture',slots:['stock','grip']},
 {id:'magazine',name:'Magazine',slots:['magazine']},
 {id:'sights',name:'Sights',slots:['opticMount','optic']},
 {id:'muzzle',name:'Muzzle',slots:['muzzle']},
 {id:'accessories',name:'Accessories',slots:['foregrip','light','sling']}
];
const RECEIVER_PLATFORMS:Readonly<Record<string,ArsenalPlatformId>>={
 'ar-a1':'ar15','ar-a2':'ar15','ar-retro':'ar15','ar-flat':'ar15',
 'akm':'ak','ak74':'ak','ak74m':'ak','ak103':'ak','ak105':'ak',
 'ak-rpk74':'ak','akcompact':'ak',
 'hk-g3-early':'g3','hk-g3-drum':'g3',
 'hk33-556-rifle':'hk33','hk53-556-compact':'hk33',
 'hk-mp5-standard':'mp5','hk-mp5sd-integral':'mp5',
 'hk-mp5k-stockless':'mp5'
};
export function arsenalPlatformForReceiver(receiverId:string):ArsenalPlatformId|undefined{
 return RECEIVER_PLATFORMS[receiverId];
}
/** Stable factory recognition excludes add-on accessories and finish variants. */
export const FACTORY_IDENTITY_SLOTS:readonly FamilyPartSlot[]=
 ['receiver','stock','handguard','barrel'];
export const ARSENAL_REFERENCES:readonly ArsenalReference[]=FAMILY_PRESETS.map(preset=>({
 id:preset.id,name:preset.name,
 platformId:RECEIVER_PLATFORMS[preset.parts.receiver],
 legacy:preset,identitySlots:FACTORY_IDENTITY_SLOTS
}));
const accessoryParts=Object.values(WEAPON_ATTACHMENTS)
 .filter((part):part is WeaponAttachment&{slot:Exclude<WeaponAttachmentSlot,'stock'>}=>part.slot!=='stock');
export const ARSENAL_PARTS:readonly ArsenalPart[]=[
 ...Object.values(FAMILY_PARTS).map((part:WeaponFamilyPart)=>({
  id:part.id,slot:part.slot,name:arsenalPartName(part),
  detail:part.name,kind:'family' as const
 })),
 ...accessoryParts.map(part=>({
  id:part.id,slot:part.slot,name:arsenalPartName(part),
  detail:part.name,kind:'accessory' as const
 }))
];
const partMap=new Map(ARSENAL_PARTS.map(part=>[part.id,part]));
export function arsenalPart(id:string):ArsenalPart|undefined{return partMap.get(id);}
export function arsenalPartsForSlot(slot:ArsenalSlot):readonly ArsenalPart[]{
 return ARSENAL_PARTS.filter(part=>part.slot===slot);
}
export function arsenalReferencesForPlatform(id:ArsenalPlatformId):readonly ArsenalReference[]{
 return ARSENAL_REFERENCES.filter(p=>p.platformId===id);
}
/** Hard checks for catalog drift; no renderer, inventory, or Campaign state. */
export function arsenalCatalogIssues():string[]{
 const issues:string[]=[];
 const seen=new Set<string>();
 for(const platform of ARSENAL_PLATFORMS){
  if(!arsenalReferencesForPlatform(platform.id).length)
   issues.push('No references for '+platform.id);
 }
 for(const p of FAMILY_PRESETS){
  if(seen.has(p.id))issues.push('Duplicate reference '+p.id);
  seen.add(p.id);
  if(!RECEIVER_PLATFORMS[p.parts.receiver])
   issues.push('Unmapped receiver '+p.parts.receiver+' in '+p.id);
  for(const [slot,id] of Object.entries(p.parts)){
   if(!FAMILY_PARTS[id]||FAMILY_PARTS[id].slot!==slot)
    issues.push('Missing '+slot+' '+id+' in '+p.id);
  }
 }
 for(const part of Object.values(FAMILY_PARTS)){
  if(part.slot==='receiver'&&!RECEIVER_PLATFORMS[part.id])
   issues.push('Unmapped receiver '+part.id);
 }
 const parts=new Set<string>();
 for(const part of ARSENAL_PARTS){
  if(parts.has(part.id))issues.push('Duplicate part '+part.id);
  parts.add(part.id);
  if(!part.name.trim())issues.push('Unnamed part '+part.id);
 }
 return issues;
}
