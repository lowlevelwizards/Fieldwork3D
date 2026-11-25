/** Shared shot-time muzzle construction: the barrel tip is the tip of
 * the same rigid gun geometry rendered by the operator rig.
 * This function is pure with respect to rendering and only runs on firing.
 */
import * as THREE from 'three';
import {casingPort,type CasingPort} from './breach-casing-sockets.ts';
import type {WeaponId} from './breach-combat.ts';
import type {GlockAppearanceId} from './weapons/geometry/glock-family-silhouettes.ts';
import {secondaryMuzzleAtShot} from './secondary-shot-geometry.ts';
import type {Handling,HandlingIntent} from './breach-weapon-pose.ts';
import {resolveWeaponAssembly,type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {fitWeaponPose,handlingPose,weaponGrips,
  shortStockSourceHandling} from './breach-weapon-pose.ts';
import {equipmentStockPush} from './breach-anatomy.ts';
import {legRestRise} from './breach-leg-geometry.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
export type MuzzleSample={x:number;y:number;z:number;yaw:number;pitch:number;
  ejection?:CasingPort};
export type MuzzleInput={x:number;z:number;heading:number;
  weaponYaw:number;weapon:WeaponId;aim:number;velocity:number;
  /** Present only when an issued Glock is settled in the firing hand. */
  secondaryWeapon?:GlockAppearanceId;
  weaponConfiguration?:WeaponConfiguration;
  recoil:number;obstruction?:boolean;friendlyNear?:boolean;
  sampleEjection?:boolean;
  threatRange?:number|null;clearanceRetraction?:number;
  shortCompression?:number;shortFrom?:Handling;
  handlingIntent?:HandlingIntent;friendlyAhead?:boolean;
  /** Explicit clearance carry selected by same shared policy. */
  carryOverride?:Handling;carryBlend?:number;
  shoulderOffset?:number;shoulderPullback?:number;
  posture?:'stand'|'crouch';
  coverStanceDrop?:number;
  equipment?:EquipmentLoadout};
export const MUZZLE_TIP=19.5;
export function muzzleAtShot(p:MuzzleInput):MuzzleSample{
  if(p.secondaryWeapon)return secondaryMuzzleAtShot({...p,weapon:p.secondaryWeapon});
  const handling=p.carryOverride??handlingPose({aim:p.aim,moving:Math.min(1,p.velocity/72),
    obstruction:!!p.obstruction,friendlyNear:!!p.friendlyNear,
    threatRange:p.threatRange,weapon:p.weapon,
    friendlyAhead:p.friendlyAhead,intent:p.handlingIntent});
  const configuration=p.weaponConfiguration?.weapon===p.weapon?
    p.weaponConfiguration:undefined;
  const fit=fitWeaponPose({weapon:p.weapon,handling,configuration,
    yaw:-p.weaponYaw+p.heading,recoil:p.recoil*6,
    shoulderOffset:p.shoulderOffset,
    shoulderPullback:p.shoulderPullback,
    aimBlend:p.aim,clearanceRetraction:p.clearanceRetraction,
    shortCompression:p.shortCompression,
    shortFrom:p.shortFrom??shortStockSourceHandling(p.aim,
      Math.min(1,p.velocity/72),p.weapon,!!p.friendlyNear),
    armorPush:equipmentStockPush(p.equipment),
    blendFrom:p.carryOverride==='low'&&p.carryBlend!==undefined?
      'ready':undefined,
    blendAlpha:p.carryOverride==='low'?p.carryBlend:undefined});
  const grip=weaponGrips(p.weapon,configuration);
  const assembly=configuration?resolveWeaponAssembly(configuration):null;
  const tip=assembly?.muzzleX??MUZZLE_TIP;
  const local=new THREE.Vector3(tip*grip.lengthScale,assembly?.muzzleY??0,0)
    .applyEuler(fit.rotation).add(fit.origin);
  const worldUp=new THREE.Vector3(0,1,0);
  const chest=26+legRestRise(p.velocity,p.posture??'stand')-
    (p.posture==='crouch'?8:0)-(p.coverStanceDrop??0);
  const ejection=p.sampleEjection?(()=>{
    const socket=casingPort(p.weapon,configuration);
    const v=new THREE.Vector3(socket.x*grip.lengthScale,socket.y,socket.z)
      .applyEuler(fit.rotation).add(fit.origin).applyAxisAngle(worldUp,-p.heading);
    return {x:p.x+v.x,y:chest+v.y,z:p.z+v.z};
  })():undefined;
  const axis=new THREE.Vector3(1,0,0).applyEuler(fit.rotation)
    .applyAxisAngle(worldUp,-p.heading).normalize();
  local.applyAxisAngle(worldUp,-p.heading);
  // Must agree with the visible neutral chest: no render-time history.
  return {x:p.x+local.x,y:26+legRestRise(p.velocity,
    p.posture??'stand')+local.y-
    (p.posture==='crouch'?8:0)-(p.coverStanceDrop??0),
    z:p.z+local.z,
    yaw:Math.atan2(axis.z,axis.x),
    pitch:Math.atan2(axis.y,Math.hypot(axis.x,axis.z)),
    ...(ejection?{ejection}:{})};
}
