/** R2 symbolic weapon-silhouette dispatcher. One source of 3D truth shared by
 * operators, dropped guns, Campaign kit and the mobile inspection workbench.
 * This intentionally contains NO ballistics, functional internals or assembly.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from './equipment-weapon-families.ts';
import {addARFamily} from './weapons/geometry/ar-silhouettes.ts';
import {addAKFamily} from './weapons/geometry/ak-silhouettes.ts';

import {AR_BLACK_METAL,AR_BLACK_POLYMER,AR_MUTED_FDE,
 AK_BLACK_METAL,AK_BLACK_POLYMER,AK_DARK_WOOD}
 from './weapons/geometry/weapon-visual-palette.ts';
export function buildModularWeaponSilhouette(build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material):THREE.Group{
 // Visual finishes are consistent across Quick Play, Campaign and the
 // operator rig, regardless of their legacy material argument palette.
 void steel;void dark;
 const root=new THREE.Group();
 if(build.family==='ar')
  addARFamily(root,build,AR_BLACK_METAL,AR_BLACK_POLYMER,AR_MUTED_FDE);
 else addAKFamily(root,build,AK_BLACK_METAL,AK_BLACK_POLYMER,AK_DARK_WOOD);
 return root;
}
