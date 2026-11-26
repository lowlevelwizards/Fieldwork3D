/** FN FAL family: shared exterior silhouette plus a handful of high-value
 * identification marks. The G3 remains a valid close neighbor in outline;
 * never force an M16 triangular handguard or oversized receiver features.
 * Geometry is generated on weapon creation/change, never per animation frame.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {buildFALCoreSilhouette} from './fal-core-silhouette.ts';
import {addFALScoopedPort,addFALPivotPair} from './fal-receiver-form.ts';
import {addCuboid} from './profile-primitives.ts';
import {addFALHandguardVents} from './fal-handguard-profiles.ts';
import {FAL_MAG_METAL,FAL_MAG_RIB,FAL_VENT_SHADOW,FAL_FNC_CALIBRATED_LOWER_METAL,FAL_TRANSITION_METAL,
 FAL_MUZZLE_METAL,FAL_MUZZLE_SLOT,FAL_WOOD,FAL_DARK_POLYMER} from './weapon-visual-palette.ts';

export function addFALFamily(root:THREE.Group,build:WeaponFamilyBuild,
 steel:THREE.Material,polymer:THREE.Material,
 showFactoryMuzzle=true):void{
 if(build.parts.receiver!=='fal-50-receiver'||
    !['fal-fixed-polymer','fal-fixed-wood','fal-para-folder'].includes(build.parts.stock)||
    !['fal-vented','fal-vented-wood'].includes(build.parts.handguard)||
    !['fal-21-service','fal-172-para'].includes(build.parts.barrel)||
    build.parts.magazine!=='fal-mag20'||
    !['fal-grip','fal-grip-wood'].includes(build.parts.grip))
  throw new Error('Unimplemented FAL appearance configuration');
 const woodStock=build.parts.stock==='fal-fixed-wood';
 const isPara=build.parts.stock==='fal-para-folder';
 const woodHandguard=build.parts.handguard==='fal-vented-wood';
 const woodGrip=build.parts.grip==='fal-grip-wood';
 // The approved P10 geometry is shared exactly; FAL wood changes materials
 // only, never receiver proportions, grip mounts or stock-contact datums.
 const core=buildFALCoreSilhouette({
  stock:isPara?steel:woodStock?FAL_WOOD:polymer,receiver:steel,receiverLower:FAL_FNC_CALIBRATED_LOWER_METAL,
  transitionMetal:FAL_TRANSITION_METAL,carryHandle:FAL_DARK_POLYMER,
  grip:woodGrip?FAL_WOOD:polymer,magazine:FAL_MAG_METAL,magazineRib:FAL_MAG_RIB,
  muzzleMetal:FAL_MUZZLE_METAL,muzzleSlot:FAL_MUZZLE_SLOT,
  handguard:woodHandguard?FAL_WOOD:polymer,barrel:steel
 },build.parts,{raisedCarryHandle:!isPara,showFactoryMuzzle});
 while(core.children.length)root.add(core.children[0]);

 // One batched geometric mark per side, three large vents each.
 // Flat side faces and vents stay together when the forearm tapers.
 addFALHandguardVents(root,build.parts.handguard,FAL_VENT_SHADOW);
 // The FAL's left charging handle must stick OUT, not be a sticker
 // on its crown. One chunky rectangle intersecting the receiver shoulder.
 const lever=addCuboid(root,'receiver',build.parts.receiver,7,
  1.40,.57,isPara?-1.72:-1.96,
  isPara?1.56:1.36,.67,isPara?.94:1.35,steel);
 lever.userData.falChargingHandle=true;
 lever.userData.falProtrudingHandle=!isPara;
 lever.userData.falParaFoldedChargingHandle=isPara;
 // One high-contrast rectangular mark, shifted forward over the magwell
 // and lower so its center lines up with the barrel's Y=0 axis.
 addFALScoopedPort(root,build.parts.receiver,8,FAL_VENT_SHADOW);
 // Recognizable *oversized* FAL pivot on both sides of the lower.
 addFALPivotPair(root,build.parts.receiver,9,steel);
}
