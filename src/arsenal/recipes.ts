/** Arsenal 2.0 Stage 2: pure versioned recipe adapter.
 * The V1 WeaponConfiguration remains the combat/save authority during the UI rollout.
 * Only authored family builds are migrated; class-only legacy weapons remain untouched.
 */
import type {WeaponId} from '../breach-combat.ts';
import {FAMILY_PART_SLOTS,FAMILY_PARTS,validFamilyBuild,matchingFamilyPreset,
 type WeaponFamilyBuild,type FamilyPartSlot} from '../equipment-weapon-families.ts';
import {WEAPON_ATTACHMENT_SLOTS,WEAPON_ATTACHMENTS,
 initialWeaponConfiguration,readWeaponConfiguration,weaponAttachmentAllowed,
 type WeaponAttachmentSlot,type WeaponConfiguration} from '../equipment-weapon-assemblies.ts';
import {arsenalPlatformForReceiver,type ArsenalPlatformId} from './catalog.ts';

export type ArsenalAccessorySlot=Exclude<WeaponAttachmentSlot,'stock'>;
export const ARSENAL_ACCESSORY_SLOTS:readonly ArsenalAccessorySlot[]=
 WEAPON_ATTACHMENT_SLOTS.filter((slot):slot is ArsenalAccessorySlot=>slot!=='stock');
export interface ArsenalRecipeV2{
 version:2;
 platformId:ArsenalPlatformId;
 /** Legacy simulation authority until a separately approved firearms migration. */
 weapon:WeaponId;
 parts:Record<FamilyPartSlot,string>;
 accessories:Record<ArsenalAccessorySlot,string>;
 /** Origin metadata only; never claim this is the current factory identity. */
 sourcePresetId?:string;
}
export const copyArsenalRecipe=(recipe:ArsenalRecipeV2):ArsenalRecipeV2=>({
 ...recipe,parts:{...recipe.parts},accessories:{...recipe.accessories}
});
/** This adapter deliberately cannot represent an old abstract attachment-stock overlay. */
export function arsenalRecipeFromLegacy(config:WeaponConfiguration):ArsenalRecipeV2|undefined{
 const build=config.build;
 if(!build||!validFamilyBuild(build,config.weapon))return undefined;
 const platformId=arsenalPlatformForReceiver(build.parts.receiver);
 if(!platformId)return undefined;
 const accessories={} as Record<ArsenalAccessorySlot,string>;
 for(const slot of ARSENAL_ACCESSORY_SLOTS)accessories[slot]=config.slots[slot];
 const recipe:ArsenalRecipeV2={version:2,platformId,weapon:config.weapon,
  parts:{...build.parts},accessories};
 const exact=matchingFamilyPreset(build);
 if(exact)recipe.sourcePresetId=exact.id;
 return arsenalRecipeIssues(recipe).length?undefined:recipe;
}
function legacyCandidate(recipe:ArsenalRecipeV2):WeaponConfiguration{
 const base=initialWeaponConfiguration(recipe.weapon);
 const receiver=FAMILY_PARTS[recipe.parts.receiver];
 const build:WeaponFamilyBuild={family:receiver.family,parts:{...recipe.parts}};
 return {version:1,weapon:recipe.weapon,build,
  slots:{...base.slots,...recipe.accessories,stock:'stock-standard'}};
}
/** Produce a valid V1 configuration, never a silently repaired/partially lost one. */
export function arsenalRecipeToLegacy(recipe:ArsenalRecipeV2):WeaponConfiguration|undefined{
 if(arsenalRecipeIssues(recipe).length)return undefined;
 const candidate=legacyCandidate(recipe);
 const normalized=readWeaponConfiguration(candidate,recipe.weapon);
 if(!normalized.build)return undefined;
 for(const slot of FAMILY_PART_SLOTS)
  if(normalized.build.parts[slot]!==recipe.parts[slot])return undefined;
 for(const slot of ARSENAL_ACCESSORY_SLOTS)
  if(normalized.slots[slot]!==recipe.accessories[slot])return undefined;
 return normalized;
}
export function arsenalRecipeIssues(recipe:ArsenalRecipeV2):string[]{
 const issues:string[]=[];
 if(recipe.version!==2)return ['Unsupported recipe version'];
 if(!recipe.parts||!recipe.accessories)return ['Incomplete recipe'];
 if(!['carbine','rifle','smg','shotgun'].includes(recipe.weapon))
  return ['Unknown gameplay class'];
 const receiver=FAMILY_PARTS[recipe.parts.receiver];
 if(!receiver||receiver.slot!=='receiver')return ['Unknown receiver'];
 if(arsenalPlatformForReceiver(receiver.id)!==recipe.platformId)
  issues.push('Receiver belongs to another Arsenal platform');
 const build:WeaponFamilyBuild={family:receiver.family,parts:recipe.parts};
 if(!validFamilyBuild(build,recipe.weapon))
  issues.push('Incompatible body components');
 const config=legacyCandidate(recipe);
 for(const slot of ARSENAL_ACCESSORY_SLOTS){
  const id=recipe.accessories[slot];
  if(typeof id!=='string'||WEAPON_ATTACHMENTS[id]?.slot!==slot||
   !weaponAttachmentAllowed(config,slot,id))
   issues.push('Invalid accessory '+slot);
 }
 return issues;
}
/** Strict reader: malformed V2 data is rejected rather than quietly inventing parts. */
export function readArsenalRecipe(raw:unknown):ArsenalRecipeV2|undefined{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return undefined;
 const obj=raw as Partial<ArsenalRecipeV2>;
 if(obj.version!==2||typeof obj.platformId!=='string'||
  typeof obj.weapon!=='string'||!obj.parts||!obj.accessories||
  typeof obj.parts!=='object'||typeof obj.accessories!=='object')return undefined;
 const parts={} as Record<FamilyPartSlot,string>;
 const accessories={} as Record<ArsenalAccessorySlot,string>;
 for(const slot of FAMILY_PART_SLOTS){
  const part=obj.parts[slot];
  if(typeof part!=='string')return undefined;
  parts[slot]=part;
 }
 for(const slot of ARSENAL_ACCESSORY_SLOTS){
  const part=obj.accessories[slot];
  if(typeof part!=='string')return undefined;
  accessories[slot]=part;
 }
 const recipe:ArsenalRecipeV2={
  version:2,platformId:obj.platformId as ArsenalPlatformId,
  weapon:obj.weapon as WeaponId,parts,accessories
 };
 if(typeof obj.sourcePresetId==='string'&&obj.sourcePresetId.length<=96)
  recipe.sourcePresetId=obj.sourcePresetId;
 return arsenalRecipeIssues(recipe).length?undefined:recipe;
}
export function sameArsenalRecipe(a:ArsenalRecipeV2,b:ArsenalRecipeV2):boolean{
 if(a.platformId!==b.platformId||a.weapon!==b.weapon||
  a.sourcePresetId!==b.sourcePresetId)return false;
 for(const slot of FAMILY_PART_SLOTS)if(a.parts[slot]!==b.parts[slot])return false;
 for(const slot of ARSENAL_ACCESSORY_SLOTS)
  if(a.accessories[slot]!==b.accessories[slot])return false;
 return true;
}
