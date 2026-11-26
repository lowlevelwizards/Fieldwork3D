/** R2 symbolic weapon-silhouette dispatcher. One source of 3D truth shared by
 * operators, dropped guns, Campaign kit and the mobile inspection workbench.
 * This intentionally contains NO ballistics, functional internals or assembly.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from './equipment-weapon-families.ts';
import {addARFamily} from './weapons/geometry/ar-silhouettes.ts';
import {addAKFamily} from './weapons/geometry/ak-silhouettes.ts';
import {addHKFamily} from './weapons/geometry/hk-silhouettes.ts';
import {addFALFamily} from './weapons/geometry/fal-silhouettes.ts';
import {addFNCFamily} from './weapons/geometry/fnc-silhouettes.ts';
import {addG36Family} from './weapons/geometry/g36-family-silhouettes.ts';
import {addR870Family} from './weapons/geometry/r870-silhouettes.ts';

import {AR_WA6_STEEL,AR_WA6_POLYMER,AR_MUTED_FDE,
 AK_BLACK_METAL,AK_BLACK_POLYMER,AK_DARK_WOOD,
 HK_BLACK_METAL,HK_DARK_POLYMER,HK_WOOD,
 FAL_BLACK_METAL,FAL_DARK_POLYMER}
 from './weapons/geometry/weapon-visual-palette.ts';
export function buildModularWeaponSilhouette(build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material,
 showFactoryMuzzle=true):THREE.Group{
 // Visual finishes are consistent across Quick Play, Campaign and the
 // operator rig, regardless of their legacy material argument palette.
 void steel;void dark;
 const root=new THREE.Group();
 if(build.family==='ar')
  addARFamily(root,build,AR_WA6_STEEL,AR_WA6_POLYMER,
   AR_MUTED_FDE,showFactoryMuzzle);
 else if(build.family==='ak')
  addAKFamily(root,build,AK_BLACK_METAL,AK_BLACK_POLYMER,AK_DARK_WOOD);
 else if(build.family==='hk')
  addHKFamily(root,build,HK_BLACK_METAL,HK_DARK_POLYMER,
   HK_WOOD,showFactoryMuzzle);
 else if(build.family==='fal')
  addFALFamily(root,build,FAL_BLACK_METAL,FAL_DARK_POLYMER,showFactoryMuzzle);
 else if(build.family==='fnc')
  addFNCFamily(root,build,showFactoryMuzzle);
 else if(build.family==='g36')
  addG36Family(root,build,showFactoryMuzzle);
 else if(build.family==='r870')
  addR870Family(root,build);
 else throw new Error('Unknown weapon visual family');
 return root;
}
