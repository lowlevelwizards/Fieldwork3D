/** Shared, highly legible HK roller-delayed lower selector. Exterior only.
 * SEF is left-hand lever / both-side letters. Pictogram is ambidextrous and
 * uses a white safe box and red fire-mode boxes. Static geometry per build.
 */
import * as THREE from 'three';
import {addWeaponPixelMarkPair} from './weapon-pixel-detail.ts';
import {HK_DARK_POLYMER} from './weapon-visual-palette.ts';

export type HKSelectorStyle='sef'|'pictogram';
/** Shared game-art selector pivot/paddle, not a separate firing mechanism.
 * Reused by classic HK rifles and the G36 with its own local location.
 * Returning the meshes lets each family retain its own saved part naming.
 */
export function addHKSelectorLeverArt(root:THREE.Group,x:number,y:number,
 lowerHalfDepth:number,side:-1|1,material:THREE.Material):readonly [THREE.Mesh,THREE.Mesh]{
 const pivot=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.26,8,1),material);
 pivot.rotation.x=Math.PI/2;
 pivot.position.set(x,y,side*(lowerHalfDepth+.14));
 pivot.name='family-art-hk-selector-hub';
 pivot.castShadow=true;pivot.receiveShadow=false;root.add(pivot);
 const lever=new THREE.Mesh(new THREE.BoxGeometry(1.10,.32,.30),material);
 lever.rotation.z=-.22;
 lever.position.set(x+.46,y+.10,side*(lowerHalfDepth+.31));
 lever.name='family-art-hk-selector-lever';
 lever.castShadow=true;lever.receiveShadow=false;root.add(lever);
 return [pivot,lever];
}
export function addHKTriggerSelector(root:THREE.Group,style:HKSelectorStyle,
 outerDepth:number,lowerHalfDepth:number):void{
 // Markings are a single cached nearest-neighbor texture on each face.
 // The upper housing is wider than the lower, so place the marks just
 // outside the visible side face. Keep their BOTTOM ABOVE the lower's
 // -2.4 silhouette edge; previously the white safe box fell off the gun.
 // All HK receivers use the same normalized icon placement.
 const marks=addWeaponPixelMarkPair(root,
  style==='pictogram'?'hk-selector-picto':'hk-selector',
  -3.21,-1.29,outerDepth+.024,3.07,1.42);
 for(const m of marks){
  m.userData.hkSelectorMarkings=style;
  m.userData.hkSelectorAlignedToHousing=true;
  // A4.5: keep left and right marks distinct for SEF/pictogram inspection,
  // while the real selector lever remains one-sided on the classic lower.
  m.userData.surfaceDetailClass='hk-fire-mode-identity';
 }
 // The selector is a chunky eight-sided polymer pivot and one broad,
 // low-poly paddle, not a little white dial drawn on the receiver.
 // The classic SEF layout only has a left lever; later pictogram is ambi.
 for(const side of (style==='pictogram'?[-1,1]:[-1])){
  const [pivot,lever]=addHKSelectorLeverArt(root,-3.98,-1.58,
   lowerHalfDepth,side as -1|1,HK_DARK_POLYMER);
  pivot.userData.hkSelectorHub=style;
  lever.userData.hkSelectorLever=style;
 }
}
