/** Unified Operator Lab model and motion browser: visual-only selections. */
import {FAMILY_PRESETS,type WeaponFamilyPreset} from './equipment-weapon-families.ts';
import {LAB_TRACKS,type LabTrack} from './breach-lab-tracks.ts';
import type {WeaponId} from './breach-combat.ts';
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
export function posePreset(id:string):WeaponFamilyPreset|undefined{
 return FAMILY_PRESETS.find(p=>p.id===id);
}
export function poseWeaponType(id:string):WeaponId|'none'{
 if(id==='none')return 'none';
 if(id==='shotgun')return 'shotgun';
 return posePreset(id)?.weapon??'none';
}
export function defaultPoseWeapon(weapon:string){
 if(weapon==='none'||weapon==='shotgun')return weapon;
 const preferred=weapon==='carbine'?'ar-m4a1':
  weapon==='rifle'?'ak-akm':'hk-mp5a3';
 const candidate=posePreset(preferred);
 return candidate?.weapon===weapon?preferred:
  FAMILY_PRESETS.find(p=>p.weapon===weapon)?.id??'none';
}
export function poseTrackGroup(track:LabTrack):string{
 if(track.startsWith('reload'))return 'RELOADS';
 if(['high-ready','low-ready','ready','short-stock','active-aim',
  'point-shoot','aim','ready-to-ads','ads-to-low'].includes(track))
  return 'WEAPON STANCES';
 if(['flash','door','kick','bash','look'].includes(track))
  return 'INTERACTIONS';
 if(track.startsWith('down')||track==='wounded')
  return 'INJURY / FALLS';
 return 'MOVEMENT';
}
export const POSE_ANIMATIONS=LAB_TRACKS.map(id=>({
 id,label:id.replaceAll('-',' ').toUpperCase(),group:poseTrackGroup(id)
}));
