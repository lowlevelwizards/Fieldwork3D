/** Unified Operator Lab model and motion browser: visual-only selections. */
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
 ['armor-bare','None'],['soft-slick','Soft / Slick'],
 ['soft-vest','Soft Vest'],['soft-flak','Flak'],
 ['plate-slick','Slick Carrier'],['plate-jpc','JPC'],
 ['plate-standard','Plate Carrier'],['plate-heavy','Heavy Carrier'],
 ['plate-legacy','Legacy Armor']
] as const;
export const POSE_RIG_OPTIONS=[
 ['no-rig','None'],['chest-placard','Placard'],
 ['micro-rig','Micro'],['light-rig','Light'],
 ['chicom-rig','Chicom'],['bandolier','Bandolier'],
 ['full-chest','Full Chest'],['field-webbing','Field Webbing'],
 ['split-front','Split Front'],['alice-lc2','ALICE'],
 ['m1956-lce','M1956'],['lbv','LBV'],['sadf-webbing','SADF']
] as const;
export const POSE_UNIFORM_OPTIONS=[
 ['bdu-shirt','BDU'],['acu-shirt','ACU'],
 ['combat-shirt','Combat Shirt'],['smock-jacket','Smock'],
 ['gorka-jacket','Gorka']
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
 {id:'beretta',name:'Beretta · art preview',
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
