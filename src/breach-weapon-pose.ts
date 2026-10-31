/** Rigid, shoulder-supported firearm geometry and feasible grip targets. */
import type {WeaponId} from './breach-combat.ts';
import * as THREE from 'three';
import {stockPocket,anchorGap} from './breach-anatomy.ts';
import {handlingProfile} from './breach-handling-profiles.ts';
export type Handling='low'|'high'|'ready'|'point'|'ads'|'short';
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
const LIMIT=19.92;
export type WeaponFit={
  origin:THREE.Vector3;rotation:THREE.Euler;
  stock:THREE.Vector3;primary:THREE.Vector3;support:THREE.Vector3;
  /** A two-handed fit exists; otherwise the support arm switches to guard. */
  twoHanded:boolean;primaryReachable:boolean;handling:Handling;
  /** Positive when a non-reload interaction explicitly releases the support grip. */
  contactError:number;
  stockError:number;
};
export type WeaponPoseInput={weapon:WeaponId;handling:Handling;
  /** Fire direction in chest-local space. */
  yaw:number;recoil:number;aimBlend?:number};
/** Rigid contact fit in chest-local space. The candidate search uses scalar
 * maths: allocating dozens of vectors per actor per render caused mobile GC
 * spikes. Only the winning solution becomes Three.js geometry.
 */
export function fitWeaponPose(input:WeaponPoseInput):WeaponFit{
  const data=weaponGrips(input.weapon),scale=data.lengthScale;
  const yaw=clamp(input.yaw,-1.1,1.1);
  const recoilX=clamp(input.recoil,0,5);
  const recoilY=Math.min(1.1,Math.max(0,input.recoil)*.2);
  // Never replace a named silhouette with an unrelated fallback.
  // IK infeasibility is exposed through contactError for the Lab.
  const selection:Handling[]=[input.handling];
  let bestScore=Infinity;
  let best:{sx:number;sy:number;sz:number;mode:Handling;
    yaw:number;roll:number;stock:[number,number,number];
    primary:[number,number,number];support:[number,number,number];
    twoHanded:boolean;primaryReachable:boolean;
    contactError:number}|null=null;
  for(const mode of selection){
    const profile=handlingProfile(mode,input.weapon);
    const aim=input.aimBlend;
    // Continuous keyed shoulder posture instead of snapping between
    // high, point and ADS at an arbitrary threshold.
    const base=profile.pitch;
    const roll=aim===undefined||mode==='short'?base:
      (-.12*(1-Math.min(1,aim/.30)));
    const sr=Math.sin(roll),cr=Math.cos(roll);
    const shoulderY=(aim===undefined||mode==='short'?
      profile.stockY:
      3.2+4.8*(Math.max(0,Math.min(1,aim))**
        2*(3-2*Math.max(0,Math.min(1,aim)))))+recoilY;
    for(const offset of [0,-.10,.10]){
      const candidateYaw=clamp(yaw+offset,-1.12,1.12);
      const cy=Math.cos(candidateYaw),sy=Math.sin(candidateYaw);
      const rotate=(x:number,y:number,z:number):[number,number,number]=>{
        const ux=cr*x*scale-sr*y;
        return [cy*ux+sy*z,sr*x*scale+cr*y,-sy*ux+cy*z];
      };
      const stock=rotate(data.stockX,0,0);
      const right=rotate(data.primaryX-data.stockX,data.primaryY,1.8);
      const left=rotate(data.supportX-data.stockX,data.supportY,-1.6);
      for(const back of [-4,-2,0,1.3,2.7,3.8,5,7,9]){
        // Short stocking truly retracts the gun rather than merely
        // tipping an otherwise full-length shoulder-ready posture.
        if(mode==='short'&&back<3.8)continue;
        const sx=2.5-back-recoilX;
        const px=sx+right[0],py=shoulderY+right[1];
        const lx=sx+left[0],ly=shoulderY+left[1];
        for(const sideways of [0,-1,-2,1.5,-3.5,-5.5,-8,-11,-14,4]){
          const sz=4.2+sideways;
          const pz=sz+right[2],lz=sz+left[2];
          const rd=Math.hypot(px-1,py-4,pz-7);
          const ld=Math.hypot(lx-1,ly-4,lz+7);
          const violation=Math.max(0,rd-LIMIT)+
            Math.max(0,ld-LIMIT);
          const pocket=stockPocket(mode);
          const shoulderError=Math.hypot(sx-pocket.x,
            shoulderY-pocket.y,sz-pocket.z);
          const cost=violation*1000+
            Math.abs(back-profile.preferredBack)*.8+
            shoulderError*.16+Math.abs(sideways)*.19+
            Math.abs(offset)*3+Math.max(0,
              Math.hypot(sx-1,shoulderY-4,sz-7)-8)*.1;
          if(cost>=bestScore)continue;
          bestScore=cost;
          best={sx,sy:shoulderY,sz,mode,yaw:candidateYaw,roll,
            stock,primary:right,support:left,twoHanded:
              rd<=LIMIT&&ld<=LIMIT,primaryReachable:rd<=LIMIT,
              contactError:violation};
        }
      }
    }
  }
  const b=best!;
  const stock=new THREE.Vector3(b.sx,b.sy,b.sz);
  const primary=new THREE.Vector3(
    b.sx+b.primary[0],b.sy+b.primary[1],b.sz+b.primary[2]);
  const support=new THREE.Vector3(
    b.sx+b.support[0],b.sy+b.support[1],b.sz+b.support[2]);
  const origin=stock.clone().sub(
    new THREE.Vector3(...b.stock));
  // Absolute stock shoulder error includes recoil impulse, but no
  // independent hand or stock teleportation occurs.
  // Compare the physical buttstock against a stable operator anatomy point,
  // not a reference synthesized from the stock itself (always zero).
  const pocket=stockPocket(input.handling);
  return {origin,rotation:new THREE.Euler(0,b.yaw,b.roll,'XYZ'),
    stock,primary,support,twoHanded:b.twoHanded,
    primaryReachable:b.primaryReachable,handling:b.mode,
    contactError:b.contactError,stockError:anchorGap(stock,pocket)};
}
/** The support-hand rest/guard target for an impossible two-handed fit. */
export function supportGuardTarget(weapon:THREE.Vector3):THREE.Vector3{
  const target=weapon.clone();target.x=clamp(target.x,7,13);
  target.y=clamp(target.y,0,6);
  target.z=clamp(target.z,-5,-1);
  return target;
}
