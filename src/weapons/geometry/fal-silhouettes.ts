/** FN FAL family: shared exterior silhouette plus a handful of high-value
 * identification marks. The G3 remains a valid close neighbor in outline;
 * never force an M16 triangular handguard or oversized receiver features.
 * Geometry is generated on weapon creation/change, never per animation frame.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {buildFALCoreSilhouette} from './fal-core-silhouette.ts';
import {addCuboid,addOutline} from './profile-primitives.ts';
import {addFALHandguardVents} from './fal-handguard-profiles.ts';
import {FAL_MAG_METAL,FAL_VENT_SHADOW,FAL_LOWER_METAL} from './weapon-visual-palette.ts';

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
  stock:polymer,receiver:steel,receiverLower:FAL_LOWER_METAL,
  grip:polymer,magazine:FAL_MAG_METAL,
  handguard:polymer,barrel:steel
 },build.parts,{raisedCarryHandle:true,showFactoryMuzzle});
 while(core.children.length)root.add(core.children[0]);

 // One batched geometric mark per side, three large vents each.
 // Flat side faces and vents stay together when the forearm tapers.
 addFALHandguardVents(root,build.parts.handguard,FAL_VENT_SHADOW);
 // Short charging handle (left) and a restrained ejection-panel mark (right).
 // These are the only receiver details that materially aid recognition.
 // The non-reciprocating charging handle belongs at the LEFT-FRONT of
 // the receiver, just behind the carrying-handle pivot. Keep it chunky.
 const handle=addCuboid(root,'receiver',build.parts.receiver,7,
  1.30,.57,-1.98,1.36,.72,.62,steel);
 handle.userData.falChargingHandle=true;
 handle.castShadow=false;
 // One bold, six-point ejection-panel mark on the RIGHT; no G3 bolt copy.
 // Embedded slightly in the receiver face to avoid a floating decal.
 const port=addOutline(root,'receiver',build.parts.receiver,8,[
  [-.50,.21],[-.38,1.16],[1.95,1.16],
  [2.50,.94],[2.50,.35],[2.22,.21]
 ],.09,FAL_VENT_SHADOW);
 port.position.z=1.80;
 port.userData.falEjectionPort=true;
 port.castShadow=false;port.receiveShadow=false;
}
