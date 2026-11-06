/** R2 symbolic weapon-silhouette dispatcher. One source of 3D truth shared by
 * operators, dropped guns, Campaign kit and the mobile inspection workbench.
 * This intentionally contains NO ballistics, functional internals or assembly.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from './equipment-weapon-families.ts';
import {addARFamily} from './weapons/geometry/ar-silhouettes.ts';
import {addAKFamily} from './weapons/geometry/ak-silhouettes.ts';

const WOOD=new THREE.MeshStandardMaterial({color:0x755039,roughness:.93,
 flatShading:true});
export function buildModularWeaponSilhouette(build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material):THREE.Group{
 const root=new THREE.Group();
 if(build.family==='ar')addARFamily(root,build,steel,dark,WOOD);
 else addAKFamily(root,build,steel,dark,WOOD);
 return root;
}
