/** Shared, highly legible HK roller-delayed lower selector. Exterior only.
 * SEF is left-hand lever / both-side letters. Pictogram is ambidextrous and
 * uses a white safe box and red fire-mode boxes. Static geometry per build.
 */
import * as THREE from 'three';
import {addWeaponPixelMarkPair} from './weapon-pixel-detail.ts';
import {HK_DARK_POLYMER} from './weapon-visual-palette.ts';

export type HKSelectorStyle='sef'|'pictogram';
export function addHKTriggerSelector(root:THREE.Group,style:HKSelectorStyle,
 outerDepth:number,lowerHalfDepth:number):void{
 // Markings are a single cached nearest-neighbor texture on each face.
 // The upper housing is wider than the lower: put the art on its visible
 // plane, not buried inside stamped steel.
 const marks=addWeaponPixelMarkPair(root,
  style==='pictogram'?'hk-selector-picto':'hk-selector',
  -3.21,-1.77,outerDepth+.024,3.07,1.86);
 for(const m of marks)m.userData.hkSelectorMarkings=style;
 // The selector is a chunky eight-sided polymer pivot and one broad,
 // low-poly paddle, not a little white dial drawn on the receiver.
 // The classic SEF layout only has a left lever; later pictogram is ambi.
 for(const side of (style==='pictogram'?[-1,1]:[-1])){
  const pivot=new THREE.Mesh(
   new THREE.CylinderGeometry(.55,.55,.26,8,1),HK_DARK_POLYMER);
  pivot.rotation.x=Math.PI/2;
  pivot.position.set(-3.98,-1.58,side*(lowerHalfDepth+.14));
  pivot.name='family-art-hk-selector-hub';
  pivot.userData.hkSelectorHub=style;
  pivot.castShadow=true;pivot.receiveShadow=false;root.add(pivot);
  const lever=new THREE.Mesh(
   new THREE.BoxGeometry(1.10,.32,.30),HK_DARK_POLYMER);
  lever.rotation.z=-.22;
  lever.position.set(-3.52,-1.48,side*(lowerHalfDepth+.31));
  lever.name='family-art-hk-selector-lever';
  lever.userData.hkSelectorLever=style;
  lever.castShadow=true;lever.receiveShadow=false;root.add(lever);
 }
}
