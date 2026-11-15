/** Production FN FNC family. Reuses the P2 model as the SINGLE 3D source:
 * Arsenal, operator rig, dropped weapon and replay all render identical art.
 * The rifle combat class remains responsible for simulation.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild,FamilyPartSlot}
 from '../../equipment-weapon-families.ts';
import {buildFNCStage1Silhouette} from './fnc-stage1-blockout.ts';
import {HK_BLACK_METAL,HK_DARK_POLYMER,HK_MUZZLE_METAL,HK556_MAG_METAL,HK556_MAG_RIB,
 FAL_LOWER_METAL,FAL_VENT_SHADOW}
 from './weapon-visual-palette.ts';
const REQUIRED:Readonly<Record<FamilyPartSlot,string>>={
 receiver:'fnc-service-receiver',stock:'fnc-tube-folder',
 grip:'fnc-service-grip',magazine:'fnc-mag30',
 handguard:'fnc-service-forearm',barrel:'fnc-177-service'
};
export function addFNCFamily(root:THREE.Group,build:WeaponFamilyBuild,
 showFactoryMuzzle=true):void{
 if(build.family!=='fnc'||Object.entries(REQUIRED).some(([slot,id])=>
   build.parts[slot as FamilyPartSlot]!==id))
  throw new Error('Unimplemented FNC factory appearance');
 const form=buildFNCStage1Silhouette(HK_BLACK_METAL,{
  steel:HK_BLACK_METAL,lower:FAL_LOWER_METAL,
  stock:HK_BLACK_METAL,buttpad:HK_DARK_POLYMER,grip:HK_DARK_POLYMER,
  handguard:HK_DARK_POLYMER,magazine:HK556_MAG_METAL,
  stamp:HK556_MAG_RIB,barrel:HK_BLACK_METAL,
  muzzle:HK_MUZZLE_METAL,shadow:FAL_VENT_SHADOW
 },showFactoryMuzzle);
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
