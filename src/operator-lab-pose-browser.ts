/** Unified Operator Lab model and motion browser: visual-only selections. */
import {wardrobeItem} from './operator-wardrobe-data.ts';
import {canonicalPackEquipment} from './operator-backpack-catalog.ts';
import {FAMILY_PRESETS,type WeaponFamilyPreset} from './equipment-weapon-families.ts';
import {ARSENAL_PLATFORMS,ARSENAL_REFERENCES}
 from './arsenal/catalog.ts';
import {LAB_TRACKS,type LabTrack} from './breach-lab-tracks.ts';
import type {WeaponId} from './breach-combat.ts';
import {GLOCK_APPEARANCE_REFERENCES,isGlockAppearanceId}
 from './weapons/geometry/glock-family-silhouettes.ts';
import {M9_APPEARANCE_REFERENCES,isM9AppearanceId}
 from './weapons/geometry/beretta-m9-silhouettes.ts';
import type {SidearmPreviewId} from './weapons/geometry/sidearm-preview.ts';
export const POSE_ARMOR_OPTIONS=[
 ['armor-bare',wardrobeItem('armorStyle','armor-bare')!.name],['soft-slick',wardrobeItem('armorStyle','soft-slick')!.name],
 ['soft-vest',wardrobeItem('armorStyle','soft-vest')!.name],['soft-flak',wardrobeItem('armorStyle','soft-flak')!.name],
 ['plate-slick',wardrobeItem('armorStyle','plate-slick')!.name],['plate-jpc',wardrobeItem('armorStyle','plate-jpc')!.name],
 ['plate-standard',wardrobeItem('armorStyle','plate-standard')!.name],['plate-heavy',wardrobeItem('armorStyle','plate-heavy')!.name],
 ['plate-legacy',wardrobeItem('armorStyle','plate-legacy')!.name]
] as const;
export const POSE_RIG_OPTIONS=[
 ['no-rig',wardrobeItem('rigStyle','no-rig')!.name],['chest-placard',wardrobeItem('rigStyle','chest-placard')!.name],
 ['micro-rig',wardrobeItem('rigStyle','micro-rig')!.name],['light-rig',wardrobeItem('rigStyle','light-rig')!.name],
 ['chicom-rig',wardrobeItem('rigStyle','chicom-rig')!.name],['bandolier',wardrobeItem('rigStyle','bandolier')!.name],
 ['full-chest',wardrobeItem('rigStyle','full-chest')!.name],['field-webbing',wardrobeItem('rigStyle','field-webbing')!.name],
 ['split-front',wardrobeItem('rigStyle','split-front')!.name],['alice-lc2',wardrobeItem('rigStyle','alice-lc2')!.name],
 ['m1956-lce',wardrobeItem('rigStyle','m1956-lce')!.name],['lbv',wardrobeItem('rigStyle','lbv')!.name],['sadf-webbing',wardrobeItem('rigStyle','sadf-webbing')!.name]
] as const;
export const POSE_PACK_OPTIONS=[
 ['no-pack',wardrobeItem('packStyle','no-pack')!.name],['hydration',wardrobeItem('packStyle','hydration')!.name],['admin-pack',wardrobeItem('packStyle','admin-pack')!.name],
 ['day-pack',wardrobeItem('packStyle','day-pack')!.name],['assault-pack',wardrobeItem('packStyle','assault-pack')!.name],['civilian-pack',wardrobeItem('packStyle','civilian-pack')!.name],
 ['field-pack',wardrobeItem('packStyle','field-pack')!.name],['rucksack',wardrobeItem('packStyle','rucksack')!.name],['medic-pack',wardrobeItem('packStyle','medic-pack')!.name],
 ['comms-pack',wardrobeItem('packStyle','comms-pack')!.name]
] as const;
export function posePackEquipment(pack:string):string{
 return canonicalPackEquipment(pack)??'backpack-day';
}
export const POSE_UNIFORM_OPTIONS=[
 ['bdu-shirt',wardrobeItem('top','bdu-shirt')!.name],['acu-shirt',wardrobeItem('top','acu-shirt')!.name],
 ['combat-shirt',wardrobeItem('top','combat-shirt')!.name],['smock-jacket',wardrobeItem('top','smock-jacket')!.name],
 ['gorka-jacket',wardrobeItem('top','gorka-jacket')!.name]
] as const;
export function poseArmorEquipment(armor:string):
 'armor-none'|'armor-soft'|'armor-carrier'{
 return armor==='armor-bare'?'armor-none':
  armor.startsWith('soft-')?'armor-soft':'armor-carrier';
}
export function poseRigEquipment(rig:string):
 'rig-none'|'rig-light'|'rig-full'{
 return rig==='no-rig'?'rig-none':
  ['chest-placard','micro-rig','light-rig','chicom-rig','bandolier']
   .includes(rig)?'rig-light':'rig-full';
}
/** The Lab is a view of the Arsenal's complete factory model roster.
 * Derive both names and group membership from the same receiver/platform
 * catalog rather than maintaining a second hard-coded family whitelist.
 * Gun identities are visual presets; gameplay still owns weapon classes.
 */
export const POSE_WEAPON_GROUPS:ReadonlyArray<Readonly<{
 id:string;name:string;presets:readonly WeaponFamilyPreset[]
}>>=ARSENAL_PLATFORMS.map(platform=>({
 id:platform.id,name:platform.name,
 presets:ARSENAL_REFERENCES.filter(ref=>ref.platformId===platform.id)
  .map(ref=>ref.legacy)
}));
/** Every genuinely modeled sidearm, including art-only Berettas, uses the
 * same rig/animation browser as the rifle and shotgun Arsenal families.
 * This list is derived from the two canonical visual-model catalogs.
 */
export const POSE_SIDEARM_GROUPS=[
 {id:'glock',name:'Glock · playable',
  models:GLOCK_APPEARANCE_REFERENCES},
 {id:'beretta',name:'Beretta',
  models:M9_APPEARANCE_REFERENCES}
] as const;
export const poseSidearm=(id:string):SidearmPreviewId|undefined=>
 isGlockAppearanceId(id)||isM9AppearanceId(id)?id:undefined;
export const poseSidearmArtOnly=(id:string):boolean=>isM9AppearanceId(id);

export function posePreset(id:string):WeaponFamilyPreset|undefined{
 return FAMILY_PRESETS.find(p=>p.id===id);
}
export function poseWeaponType(id:string):WeaponId|'none'|'pistol'{
 if(id==='none')return 'none';
 if(id==='shotgun')return 'shotgun';
 if(poseSidearm(id))return 'pistol';
 return posePreset(id)?.weapon??'none';
}
export function defaultPoseWeapon(weapon:string){
 if(weapon==='none'||weapon==='shotgun')return weapon;
 if(weapon==='pistol')return 'glock-g19-gen3';
 const preferred=weapon==='carbine'?'ar-m4a1':
  weapon==='rifle'?'ak-akm':'hk-mp5a3';
 const candidate=posePreset(preferred);
 return candidate?.weapon===weapon?preferred:
  FAMILY_PRESETS.find(p=>p.weapon===weapon)?.id??'none';
}
export function poseTrackGroup(track:LabTrack):string{
 if(track.startsWith('pistol-'))
  return ['pistol-low-ready','pistol-high-ready','pistol-ready',
   'pistol-aim','pistol-retention'].includes(track)?
   'PISTOL STANCES':'PISTOL ACTIONS';
 if(track.startsWith('reload'))return 'RELOADS';
 if(['high-ready','low-ready','ready','short-stock','active-aim',
  'point-shoot','aim','ready-to-ads','ads-to-low'].includes(track))
  return 'WEAPON STANCES';
 if(['flash','door','kick','bash','look'].includes(track)||
   track.startsWith('pre-open')||track.startsWith('stack-shoulder'))
  return 'INTERACTIONS';
 if(track.startsWith('down')||track==='wounded')
  return 'INJURY / FALLS';
 return 'MOVEMENT';
}
export const POSE_ANIMATIONS=LAB_TRACKS.map(id=>({
 id,label:id.replaceAll('-',' ').toUpperCase(),group:poseTrackGroup(id)
}));
