/** FN FAL family: shared exterior silhouette plus a handful of high-value
 * identification marks. The G3 remains a valid close neighbor in outline;
 * never force an M16 triangular handguard or oversized receiver features.
 * Geometry is generated on weapon creation/change, never per animation frame.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {buildFALCoreSilhouette} from './fal-core-silhouette.ts';
import {addOutline} from './profile-primitives.ts';
import {addFALScoopedPort,addFALPivotPair} from './fal-receiver-form.ts';
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
 // Chunky left cocking lever and a long SIDE RUNNER. These share the
 // FN upper side but not the right-hand ejection opening.
 const handle=addOutline(root,'receiver',build.parts.receiver,7,[
  [.48,.54],[2.18,.54],[2.18,.82],
  [1.90,.95],[1.58,1.11],[.66,1.11],[.48,.91]
 ],.56,steel);
 handle.position.z=-1.94;
 handle.userData.falChargingHandle=true;
 handle.castShadow=false;
 // Right: one high, broad scoop on the sloped shoulder, not a port sticker
 // hovering above the faceted receiver. No counterpart on the left.
 addFALScoopedPort(root,build.parts.receiver,8,FAL_VENT_SHADOW);
 // Both sides: one memorable, deliberately enlarged circular silhouette.
 addFALPivotPair(root,build.parts.receiver,9,steel);
 const runner=addOutline(root,'receiver',build.parts.receiver,11,[
  [-2.75,.59],[2.68,.59],[2.68,.96],
  [2.00,1.04],[-2.45,1.04]
 ],.24,steel);
 runner.position.z=-1.77;
 runner.userData.falChargingTrack=true;
 runner.castShadow=false;
}
