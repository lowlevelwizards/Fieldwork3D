/** Shared shot-time muzzle construction: the barrel tip is the tip of
 * the same rigid gun geometry rendered by the operator rig.
 * This function is pure with respect to rendering and only runs on firing.
 */
import * as THREE from 'three';
import type {WeaponId} from './breach-combat.ts';
import {resolveWeaponAssembly,type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {fitWeaponPose,handlingPose,weaponGrips} from './breach-weapon-pose.ts';
export type MuzzleSample={x:number;y:number;z:number;yaw:number;pitch:number};
export type MuzzleInput={x:number;z:number;heading:number;
  weaponYaw:number;weapon:WeaponId;aim:number;velocity:number;
  weaponConfiguration?:WeaponConfiguration;
  recoil:number;obstruction?:boolean;friendlyNear?:boolean;
  threatRange?:number|null;clearanceRetraction?:number;
  posture?:'stand'|'crouch'};
export const MUZZLE_TIP=19.5;
export function muzzleAtShot(p:MuzzleInput):MuzzleSample{
  const handling=handlingPose({aim:p.aim,moving:Math.min(1,p.velocity/72),
    obstruction:!!p.obstruction,friendlyNear:!!p.friendlyNear,
    threatRange:p.threatRange,weapon:p.weapon});
  const configuration=p.weaponConfiguration?.weapon===p.weapon?
    p.weaponConfiguration:undefined;
  const fit=fitWeaponPose({weapon:p.weapon,handling,configuration,
    yaw:-p.weaponYaw+p.heading,recoil:p.recoil*6,
    aimBlend:p.aim,clearanceRetraction:p.clearanceRetraction});
  const grip=weaponGrips(p.weapon,configuration);
  const tip=configuration?resolveWeaponAssembly(configuration).muzzleX:MUZZLE_TIP;
  const local=new THREE.Vector3(tip*grip.lengthScale,0,0)
    .applyEuler(fit.rotation).add(fit.origin);
  const worldUp=new THREE.Vector3(0,1,0);
  const axis=new THREE.Vector3(1,0,0).applyEuler(fit.rotation)
    .applyAxisAngle(worldUp,-p.heading).normalize();
  local.applyAxisAngle(worldUp,-p.heading);
  return {x:p.x+local.x,y:26+local.y-
    (p.posture==='crouch'?8:0),z:p.z+local.z,
    yaw:Math.atan2(axis.z,axis.x),
    pitch:Math.atan2(axis.y,Math.hypot(axis.x,axis.z))};
}
