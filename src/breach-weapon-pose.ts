/** Rigid, shoulder-supported firearm geometry and feasible grip targets. */
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
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
const SHOULDER_LEFT=new THREE.Vector3(1,4,-7);
const SHOULDER_RIGHT=new THREE.Vector3(1,4,7);
const LIMIT=19.92;
export type WeaponFit={
  origin:THREE.Vector3;rotation:THREE.Euler;
  stock:THREE.Vector3;primary:THREE.Vector3;support:THREE.Vector3;
  /** A two-handed fit exists; otherwise the support arm switches to guard. */
  twoHanded:boolean;primaryReachable:boolean;handling:Handling;
  stockError:number;
};
export type WeaponPoseInput={weapon:WeaponId;handling:Handling;
  /** Fire direction in chest-local space. */
  yaw:number;recoil:number};
function transform(point:THREE.Vector3,scale:number,
  rotation:THREE.Euler,origin:THREE.Vector3){
  return point.clone().multiply(new THREE.Vector3(scale,1,1))
    .applyEuler(rotation).add(origin);
}
function pocketY(handling:Handling){
  return handling==='ads'?8:handling==='point'?5.3:
    handling==='high'?6:handling==='short'?4:2.5;
}
/** Only firearm pose may move firearm geometry. The grip points are derived
 * from that SAME rigid transform, never clamped independently of the weapon.
 *
 * The search permits small shoulder-pocket adjustments and a guarded yaw
 * limit. Impossible over-shoulder targets fall back to a short-stock posture
 * rather than stretching an elbow or drawing an arm through the chest.
 */
export function fitWeaponPose(input:WeaponPoseInput):WeaponFit{
  const data=weaponGrips(input.weapon),scale=data.lengthScale;
  const handR=new THREE.Vector3(data.primaryX,data.primaryY,1.8);
  const handL=new THREE.Vector3(data.supportX,data.supportY,-1.6);
  const stockLocal=new THREE.Vector3(data.stockX,0,0);
  const requestedYaw=clamp(input.yaw,-1.1,1.1);
  const selection:Handling[]=[input.handling];
  if(input.handling!=='short')selection.push('short');
  let best:WeaponFit|null=null,bestScore=Infinity;
  for(const mode of selection){
    const baseRoll=mode==='low'?-.16:mode==='high'?.13:
      mode==='short'?-.08:0;
    const pocket=new THREE.Vector3(2.5,pocketY(mode),4.2);
    for(const yawOffset of [0,-.10,.10]){
      const rotation=new THREE.Euler(0,
        clamp(requestedYaw+yawOffset,-1.12,1.12),baseRoll,'XYZ');
      for(const back of [0,1.3,2.7,3.8]){
        for(const sideways of [0,-1.0,-2.0]){
          const stockTarget=pocket.clone().add(
            new THREE.Vector3(-back,0,sideways));
          const origin=stockTarget.clone().sub(
            transform(stockLocal,scale,rotation,new THREE.Vector3()));
          origin.x-=clamp(input.recoil,0,5);
          origin.y+=Math.min(1.1,Math.max(0,input.recoil)*.2);
          const primary=transform(handR,scale,rotation,origin);
          const support=transform(handL,scale,rotation,origin);
          const actualStock=transform(stockLocal,scale,rotation,origin);
          const rightDistance=primary.distanceTo(SHOULDER_RIGHT);
          const leftDistance=support.distanceTo(SHOULDER_LEFT);
          const viable=rightDistance<=LIMIT&&leftDistance<=LIMIT;
          const primaryOK=rightDistance<=LIMIT;
          const violation=Math.max(0,rightDistance-LIMIT)*20+
            Math.max(0,leftDistance-LIMIT)*20;
          const cost=violation+
            (mode===input.handling?0:1.3)+back*.28+
            Math.abs(sideways)*.19+Math.abs(yawOffset)*3+
            Math.max(0,actualStock.distanceTo(SHOULDER_RIGHT)-8)*.1;
          if(cost>=bestScore)continue;
          const fit={origin,rotation,stock:actualStock,primary,support,
            twoHanded:viable,primaryReachable:primaryOK,handling:mode,
            stockError:actualStock.distanceTo(stockTarget)};
          best=fit;bestScore=cost;
        }
      }
    }
  }
  // Keep the firing hand attached when physically possible. A support arm
  // that cannot reach falls into an alternate guarded pose in the rig.
  return best!;
}
/** The support-hand rest/guard target for an impossible two-handed fit. */
export function supportGuardTarget(weapon:THREE.Vector3):THREE.Vector3{
  const target=weapon.clone();target.x=clamp(target.x,7,13);
  target.y=clamp(target.y,0,6);
  target.z=clamp(target.z,-5,-1);
  return target;
}
