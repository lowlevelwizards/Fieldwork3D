/** Rigid, shoulder-supported firearm geometry and feasible grip targets. */
import type {WeaponId} from './breach-combat.ts';
import * as THREE from 'three';
import {stockPocket,anchorGap} from './breach-anatomy.ts';
import {handlingProfile} from './breach-handling-profiles.ts';
export type Handling='low'|'high'|'ready'|'point'|'ads'|'short';
export type WeaponGrip={lengthScale:number;stockX:number;
  primaryX:number;primaryY:number;supportX:number;supportY:number};
export const GRIPS:Record<WeaponId,WeaponGrip>={
  // Buttstock block is centered at -10 with width 9: its rear face
  // is -14.5, not -10. Hand placement remains on the actual gun mesh.
  carbine:{lengthScale:1,stockX:-14.5,primaryX:-1,primaryY:-2,
    supportX:-1.8,supportY:-1.5},
  smg:{lengthScale:.72,stockX:-14.5,primaryX:-1,primaryY:-2,
    supportX:-.5,supportY:-1},
  rifle:{lengthScale:1.19,stockX:-14.5,primaryX:-1,primaryY:-2,
    supportX:-3,supportY:-1.5},
  shotgun:{lengthScale:1.08,stockX:-14.5,primaryX:-1,primaryY:-2,
    supportX:-2.6,supportY:-2},
};
export const weaponGrips=(id:WeaponId):WeaponGrip=>GRIPS[id];
export function handlingPose(input:{aim:number;moving:number;
  obstruction:boolean;friendlyNear:boolean}):Handling{
  if(input.obstruction)return 'short';
  if(input.friendlyNear&&input.aim<.85)return 'low';
  if(input.aim>=.82)return 'ads';
  if(input.aim>=.20)return 'point';
  if(input.moving>.32)return 'low';
  return 'ready';
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
  yaw:number;recoil:number;aimBlend?:number;
  blendFrom?:Handling;blendAlpha?:number};
/** Rigid contact fit in chest-local space. The candidate search uses scalar
 * maths: allocating dozens of vectors per actor per render caused mobile GC
 * spikes. Only the winning solution becomes Three.js geometry.
 */
export function fitWeaponPose(input:WeaponPoseInput):WeaponFit{
  if(input.blendFrom&&input.blendAlpha!==undefined){
    const from=fitWeaponPose({...input,handling:input.blendFrom,
      blendFrom:undefined,blendAlpha:undefined});
    const to=fitWeaponPose({...input,blendFrom:undefined,
      blendAlpha:undefined});
    const t=clamp(input.blendAlpha,0,1);
    const origin=from.origin.clone().lerp(to.origin,t);
    const q=new THREE.Quaternion().setFromEuler(from.rotation);
    q.slerp(new THREE.Quaternion().setFromEuler(to.rotation),t);
    const rotation=new THREE.Euler().setFromQuaternion(q,'XYZ');
    const data=weaponGrips(input.weapon);
    const point=(x:number,y:number,z:number)=>new THREE.Vector3(
      x*data.lengthScale,y,z).applyEuler(rotation).add(origin);
    const stock=point(data.stockX,0,0);
    const primary=point(data.primaryX,data.primaryY,1.8);
    const support=point(data.supportX,data.supportY,-1.6);
    const right=primary.distanceTo(new THREE.Vector3(1,4,7)),
      left=support.distanceTo(new THREE.Vector3(1,4,-7));
    return {...to,origin,rotation,stock,primary,support,
      twoHanded:right<=LIMIT&&left<=LIMIT,
      primaryReachable:right<=LIMIT,
      contactError:Math.max(0,right-LIMIT)+Math.max(0,left-LIMIT),
      stockError:(()=>{
        const a=stockPocket(input.blendFrom!),b=stockPocket(input.handling);
        return anchorGap(stock,{x:a.x+(b.x-a.x)*t,
          y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
      })()};
  }
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
    // Actual gameplay aim is a continuous presentation parameter. Short
    // stocking is an explicit collision response and remains compressed.
    // Shared by authoritative muzzle construction and visible firearm.
    const blendAim=Math.max(0,Math.min(1,aim??0));
    const roll=aim===undefined||mode==='short'?base:
      base*(1-blendAim)+
      (blendAim<.82?handlingProfile('point',input.weapon).pitch:
        handlingProfile('ads',input.weapon).pitch)*blendAim;
    const sr=Math.sin(roll),cr=Math.cos(roll);
    const shoulderY=(aim===undefined||mode==='short'?
      profile.stockY:
      3.2+4.8*(Math.max(0,Math.min(1,aim))**
        2*(3-2*Math.max(0,Math.min(1,aim)))))+recoilY;
    // Buttplate is the authority. Search only around an EXTERNAL shoulder
    // contact, never around the old in-chest receiver midpoint. Keep tiny
    // yaw variations to preserve the authoritative shot heading.
    const normalPocket=stockPocket(mode);
    const shoulderPocket=input.aimBlend===undefined||mode==='short'?
      normalPocket:{
        x:stockPocket('ready').x+
          (stockPocket('ads').x-stockPocket('ready').x)*blendAim,
        y:stockPocket('ready').y+
          (stockPocket('ads').y-stockPocket('ready').y)*blendAim,
        z:normalPocket.z
      };
    for(const offset of [0,-.035,.035]){
      const candidateYaw=clamp(yaw+offset,-1.12,1.12);
      const cy=Math.cos(candidateYaw),sy=Math.sin(candidateYaw);
      const rotate=(x:number,y:number,z:number):[number,number,number]=>{
        const ux=cr*x*scale-sr*y;
        return [cy*ux+sy*z,sr*x*scale+cr*y,-sy*ux+cy*z];
      };
      const stock=rotate(data.stockX,0,0);
      const right=rotate(data.primaryX-data.stockX,data.primaryY,1.8);
      const left=rotate(data.supportX-data.stockX,data.supportY,-1.6);
      for(const dx of [0,.7,-.7,1.4,-1.4])
        for(const dz of [0,.4,-.4,.8,-.8]){
          const sx=shoulderPocket.x+dx-recoilX;
          const sy=shoulderPocket.y+recoilY;
          const sz=shoulderPocket.z+dz;
          // The stock is 3.5 deep; remain outside the torso's +/-7 Z.
          if(sz<8.15)continue;
          const px=sx+right[0],py=sy+right[1],pz=sz+right[2];
          const lx=sx+left[0],ly=sy+left[1],lz=sz+left[2];
          const rd=Math.hypot(px-1,py-4,pz-7);
          const ld=Math.hypot(lx-1,ly-4,lz+7);
          const violation=Math.max(0,rd-LIMIT)+Math.max(0,ld-LIMIT);
          const contact=Math.hypot(dx,dz);
          // Do not bury the buttstock to improve IK reach. A small reported
          // hand reach error is preferable to crossing the torso mesh.
          const cost=violation*13+contact*3+
            Math.abs(offset)*2+Math.abs(dx)*.25;
          if(cost>=bestScore)continue;
          bestScore=cost;
          best={sx,sy,sz,mode,yaw:candidateYaw,roll,
            stock,primary:right,support:left,twoHanded:
              rd<=LIMIT&&ld<=LIMIT,primaryReachable:rd<=LIMIT,
            contactError:violation};
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
  const pocket=input.aimBlend===undefined||input.handling==='short'?
    stockPocket(input.handling):{
      x:stockPocket('ready').x+
        (stockPocket('ads').x-stockPocket('ready').x)*
        clamp(input.aimBlend,0,1),
      y:stockPocket('ready').y+
        (stockPocket('ads').y-stockPocket('ready').y)*
        clamp(input.aimBlend,0,1),
      z:stockPocket(input.handling).z
    };
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
