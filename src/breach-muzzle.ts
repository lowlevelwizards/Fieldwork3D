/** Shared shot-time muzzle construction: the barrel tip is the tip of
 * the same rigid gun geometry rendered by the operator rig.
 * This function is pure with respect to rendering and only runs on firing.
 */
import * as THREE from 'three';
import type {WeaponId} from './breach-combat.ts';
import {fitWeaponPose,handlingPose,weaponGrips} from './breach-weapon-pose.ts';
export type MuzzleSample={x:number;y:number;z:number};
export type MuzzleInput={x:number;z:number;heading:number;
  weaponYaw:number;weapon:WeaponId;aim:number;velocity:number;
  recoil:number;obstruction?:boolean;friendlyNear?:boolean};
export const MUZZLE_TIP=19.5;
export function muzzleAtShot(p:MuzzleInput):MuzzleSample{
  const handling=handlingPose({aim:p.aim,moving:Math.min(1,p.velocity/72),
    obstruction:!!p.obstruction,friendlyNear:!!p.friendlyNear});
  const fit=fitWeaponPose({weapon:p.weapon,handling,
    yaw:-p.weaponYaw+p.heading,recoil:p.recoil*6,
    aimBlend:p.aim});
  const grip=weaponGrips(p.weapon);
  const local=new THREE.Vector3(MUZZLE_TIP*grip.lengthScale,0,0)
    .applyEuler(fit.rotation).add(fit.origin);
  local.applyAxisAngle(new THREE.Vector3(0,1,0),-p.heading);
  return {x:p.x+local.x,y:26+local.y,z:p.z+local.z};
}
