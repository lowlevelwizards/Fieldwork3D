/** Production FN FNC family. Reuses the P2 model as the SINGLE 3D source:
 * Arsenal, operator rig, dropped weapon and replay all render identical art.
 * The rifle combat class remains responsible for simulation.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild,FamilyPartSlot}
 from '../../equipment-weapon-families.ts';
import {buildFNCStage1Silhouette} from './fnc-stage1-blockout.ts';
import {FNC_BLACK_METAL,FNC_DARK_POLYMER,HK_MUZZLE_METAL,AR_STANAG_METAL,AR_STANAG_RIB,AR_MUTED_FDE,
 FAL_FNC_CALIBRATED_LOWER_METAL,FAL_DARK_POLYMER,FAL_VENT_SHADOW}
 from './weapon-visual-palette.ts';
const REQUIRED:Readonly<Record<FamilyPartSlot,string>>={
 receiver:'fnc-service-receiver',stock:'fnc-tube-folder',
 grip:'fnc-service-grip',magazine:'ar-mag30',
 handguard:'fnc-service-forearm',barrel:'fnc-177-service'
};
export function addFNCFamily(root:THREE.Group,build:WeaponFamilyBuild,
 showFactoryMuzzle=true):void{
 const magazines=['ar-mag20','ar-mag30','ar-magpoly','fnc-mag30'];
 if(build.family!=='fnc'||!magazines.includes(build.parts.magazine)||
  Object.entries(REQUIRED).some(([slot,id])=>slot!=='magazine'&&
   build.parts[slot as FamilyPartSlot]!==id))
  throw new Error('Unimplemented FNC factory appearance');
 const form=buildFNCStage1Silhouette(FNC_BLACK_METAL,{
  steel:FNC_BLACK_METAL,lower:FAL_FNC_CALIBRATED_LOWER_METAL,
  stock:FNC_BLACK_METAL,buttpad:FNC_DARK_POLYMER,grip:FNC_DARK_POLYMER,
  handguard:FAL_DARK_POLYMER,magazine:AR_STANAG_METAL,
  polymerToe:AR_MUTED_FDE,stamp:AR_STANAG_RIB,barrel:FNC_BLACK_METAL,
  muzzle:HK_MUZZLE_METAL,shadow:FAL_VENT_SHADOW
 },showFactoryMuzzle,build.parts.magazine);
 const index:Record<FamilyPartSlot,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 while(form.children.length){
  const child=form.children[0];
  const slot=(Object.keys(REQUIRED) as FamilyPartSlot[])
   .find(s=>child.name.startsWith('family-'+s+'-'));
  if(!slot)throw new Error('Unassigned FNC mesh: '+child.name);
  child.name='family-'+slot+'-'+build.parts[slot]+'-'+index[slot]++;
  root.add(child);
 }
}
