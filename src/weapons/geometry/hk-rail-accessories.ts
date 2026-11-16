/** A3: HK-specific claw-to-top-rail adapter.
 * One authoritatively mounted assembly, one renderable, same four claw feet.
 * The generic foregrip is now built once by breach-weapon-accessories.ts.
 */
import * as THREE from 'three';
import {HK_BLACK_METAL} from './weapon-visual-palette.ts';
import {accessoryMergedBoxes,type AccessoryBoxSpec} from './accessory-primitives.ts';
export function addHKClawRail(root:THREE.Group):void{
 const parts:AccessoryBoxSpec[]=[];
 for(const x of [-4.90,1.60])for(const z of [-1.39,1.39])
  parts.push([x,2.76,z,.74,2.18,.58]);
 parts.push([-1.65,4.06,0,7.62,.46,2.40]);
 for(const x of [-3.60,-1.55,.45])
  parts.push([x,4.36,0,.40,.17,2.42]);
 const mount=accessoryMergedBoxes(root,'family-art-hk-claw-assembly',
  parts,HK_BLACK_METAL);
 mount.userData.hkClawMount='assembly';
}
