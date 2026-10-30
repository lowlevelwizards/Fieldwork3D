/** Physical contact definitions shared by the shooter and the rig. */
import type {WeaponId} from './breach-combat.ts';
import * as THREE from 'three';
export type Handling='low'|'high'|'point'|'ads'|'short';
export type WeaponGrip={lengthScale:number;stockX:number;
  primaryX:number;primaryY:number;supportX:number;supportY:number};
export const GRIPS:Record<WeaponId,WeaponGrip>={
  carbine:{lengthScale:1,stockX:-10,primaryX:-1,primaryY:-2,
    supportX:4,supportY:-1.5},
  smg:{lengthScale:.72,stockX:-10,primaryX:-1,primaryY:-2,
    supportX:3.1,supportY:-1},
  rifle:{lengthScale:1.19,stockX:-10,primaryX:-1,primaryY:-2,
    supportX:3.9,supportY:-1.5},
  shotgun:{lengthScale:1.08,stockX:-10,primaryX:-1,primaryY:-2,
    supportX:4.5,supportY:-2},
};
export const weaponGrips=(id:WeaponId):WeaponGrip=>GRIPS[id];
export function handlingPose(input:{aim:number;moving:number;
  obstruction:boolean;friendlyNear:boolean}):Handling{
  if(input.obstruction)return 'short';
  if(input.friendlyNear&&input.aim<.85)return 'low';
  if(input.aim>=.82)return 'ads';
  if(input.aim>=.20)return 'point';
  if(input.moving>.32)return 'low';
  return 'high';
}
export function clampReach(from:THREE.Vector3,target:THREE.Vector3,
  length:number):THREE.Vector3{
  const delta=target.clone().sub(from);
  if(delta.lengthSq()>length*length)
    return from.clone().add(delta.normalize().multiplyScalar(length));
  return target.clone();
}
