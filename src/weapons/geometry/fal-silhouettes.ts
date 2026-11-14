/** FN FAL family: shared exterior silhouette plus a handful of high-value
 * identification marks. The G3 remains a valid close neighbor in outline;
 * never force an M16 triangular handguard or oversized receiver features.
 * Geometry is generated on weapon creation/change, never per animation frame.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {buildFALCoreSilhouette} from './fal-core-silhouette.ts';
import {addCuboid} from './profile-primitives.ts';
import {FAL_MAG_METAL,FAL_VENT_SHADOW} from './weapon-visual-palette.ts';

export function addFALFamily(root:THREE.Group,build:WeaponFamilyBuild,
 steel:THREE.Material,polymer:THREE.Material,
 showFactoryMuzzle=true):void{
 if(build.parts.receiver!=='fal-50-receiver'||
    build.parts.stock!=='fal-fixed-polymer'||
    build.parts.handguard!=='fal-vented'||
    build.parts.barrel!=='fal-21-service'||
    build.parts.magazine!=='fal-mag20'||
    build.parts.grip!=='fal-grip')
  throw new Error('Unimplemented FAL appearance configuration');
 // One common geometry source: S1C lab and live Arsenal use identical forms.
 const core=buildFALCoreSilhouette({
  stock:polymer,receiver:steel,grip:polymer,magazine:FAL_MAG_METAL,
  handguard:polymer,barrel:steel
 },build.parts,{raisedCarryHandle:true,showFactoryMuzzle});
 while(core.children.length)root.add(core.children[0]);

 // FAL's large, high-positioned ventilation openings: three shadows per
 // visible side rather than real perforations, inset bevels or internal mesh.
 let n=0;
 for(const z of [-1.78,1.78]){
  for(const x of [6.65,9.25,11.75]){
   const mark=addCuboid(root,'handguard',build.parts.handguard,1+n++,
    x,.79,z,1.54,.38,.10,FAL_VENT_SHADOW);
   mark.castShadow=false;mark.receiveShadow=false;
  }
 }
 // Short charging handle (left) and a restrained ejection-panel mark (right).
 // These are the only receiver details that materially aid recognition.
 const handle=addCuboid(root,'receiver',build.parts.receiver,7,
  -4.8,.52,-1.99,1.18,.60,.52,steel);
 handle.castShadow=false;
 const port=addCuboid(root,'receiver',build.parts.receiver,8,
  1.05,.61,1.81,2.25,.54,.11,FAL_VENT_SHADOW);
 port.castShadow=false;port.receiveShadow=false;
}
