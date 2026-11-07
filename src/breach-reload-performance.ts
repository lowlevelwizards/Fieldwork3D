/** B24: authored, deterministic reload *presentation* timelines.
 * The existing simulation remains the only authority for detachable-mag
 * identity and its .29 detach / .82 insert events, chamber and shots.
 * This file has no ammo writes, render history or input actions.
 */
import type {WeaponId} from './breach-combat.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {ReloadMode} from './breach-magazines.ts';
import type {WeaponFit} from './breach-weapon-pose.ts';
import * as THREE from 'three';

export type ReloadMechanism='ar-bolt-catch'|'ak-rocking'|
 'hk-roller'|'shell-tube'|'legacy';
export type ReloadBeat='present'|'remove'|'retrieve'|'insert'|
 'operate'|'recover'|'shell-load';
export type ReloadGesture='none'|'hk-cock-lock'|'hk-slap'|
 'ar-bolt-release'|'ak-operating-handle';
export type ReloadAnimationCue={
 mechanism:ReloadMechanism;beat:ReloadBeat;gesture:ReloadGesture;
 /** 0..1 visual pose weight; never an inventory clock. */
 presentation:number;
 /** 0..1 gesture weight for the moving hand/visible control. */
 gestureWeight:number;
};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const ease=(v:number)=>{const t=clamp(v);return t*t*(3-2*t)};
/** HK416, where modeled, resolves through the AR receiver family; the
 * HK slap is specifically for MP5/G3/HK33/HK53 roller-delayed layouts.
 */
export function reloadMechanismFor(weapon:WeaponId,
 configuration?:WeaponConfiguration):ReloadMechanism{
 if(weapon==='shotgun')return 'shell-tube';
 const family=configuration?.weapon===weapon?
  configuration.build?.family:undefined;
 if(family==='ar')return 'ar-bolt-catch';
 if(family==='ak')return 'ak-rocking';
 if(family==='hk')return 'hk-roller';
 return 'legacy';
}
export function reloadAnimationCue(mechanism:ReloadMechanism,
 mode:ReloadMode,progress:number):ReloadAnimationCue{
 const t=clamp(progress);
 if(mode==='shells'||mechanism==='shell-tube')return {
  mechanism,beat:t<.18?'present':t<.88?'shell-load':'recover',
  gesture:'none',presentation:0,gestureWeight:0};
 const beat:ReloadBeat=t<.20?'present':t<.47?'remove':
  t<.68?'retrieve':t<.82?'insert':t<.96?'operate':'recover';
 const presentation=ease(t/.20)*(1-ease((t-.82)/.18));
 let gesture:ReloadGesture='none',gestureWeight=0;
 if(mode==='emergency'){
  if(mechanism==='hk-roller'&&t>=.075&&t<=.24){
   gesture='hk-cock-lock';
   gestureWeight=Math.min(ease((t-.075)/.065),
    1-ease((t-.18)/.06));
  }else if(t>=.82&&t<.96){
   gesture=mechanism==='ar-bolt-catch'?'ar-bolt-release':
    mechanism==='ak-rocking'?'ak-operating-handle':
    mechanism==='hk-roller'?'hk-slap':'none';
   gestureWeight=ease((t-.82)/.055)*
    (1-ease((t-.90)/.06));
  }
 }
 return {mechanism,beat,gesture,presentation,
  gestureWeight:clamp(gestureWeight)};
}
/** An authored silhouette target, not a solver candidate set.
 * +X weapon-forward, +Y up, +Z firing-arm side in chest space.
 * Angles are game-art radians and deliberately exaggerated for isometric
 * readability; the actual muzzle/shot model is unaffected.
 */
export type ReloadWeaponPresentationTarget={
 yaw:number;pitch:number;roll:number;
 forward:number;up:number;side:number;
};
const ART:Record<ReloadMechanism,ReloadWeaponPresentationTarget>={
 'ar-bolt-catch':{yaw:-.15,pitch:-.045,roll:.22,
  forward:1.35,up:.35,side:-.80},
 'ak-rocking':{yaw:-.12,pitch:-.075,roll:-.24,
  forward:1.45,up:.25,side:-.78},
 'hk-roller':{yaw:-.14,pitch:-.06,roll:.20,
  forward:1.48,up:.45,side:-.85},
 'shell-tube':{yaw:0,pitch:0,roll:0,forward:0,up:0,side:0},
 'legacy':{yaw:-.12,pitch:-.05,roll:0,
  forward:1.10,up:.20,side:-.50}
};
export function reloadWeaponPresentationTarget(
 mechanism:ReloadMechanism,mode:ReloadMode,progress:number
):ReloadWeaponPresentationTarget{
 const c=reloadAnimationCue(mechanism,mode,progress);
 const k=c.presentation*(mode==='retention'?.82:1);
 // Exact, bit-neutral mount and start/end frames: no signed -0.
 if(k===0)return {yaw:0,pitch:0,roll:0,forward:0,up:0,side:0};
 const p=ART[mechanism];
 return {yaw:p.yaw*k,pitch:p.pitch*k,roll:p.roll*k,
  forward:p.forward*k,up:p.up*k,side:p.side*k};
}

/** B25: the firearm itself enters an authored, mechanism-specific reload
 * presentation. Only the opt-in Lab renderer calls this. Every contact
 * point uses ONE rigid transform; no independent hand/stock teleport.
 */
export function choreographV4ReloadWeapon(
 fit:WeaponFit,mode:ReloadMode,progress:number,mechanism:ReloadMechanism
):{fit:WeaponFit;cue:ReloadAnimationCue}{
 const cue=reloadAnimationCue(mechanism,mode,progress);
 const p=reloadWeaponPresentationTarget(mechanism,mode,progress);
 if(p.yaw===0&&p.pitch===0&&p.roll===0&&
    p.forward===0&&p.up===0&&p.side===0)return {fit,cue};
 const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0),
  Z=new THREE.Vector3(0,0,1);
 const spin=new THREE.Quaternion().setFromAxisAngle(Y,p.yaw)
  .multiply(new THREE.Quaternion().setFromAxisAngle(Z,p.pitch))
  .multiply(new THREE.Quaternion().setFromAxisAngle(X,p.roll));
 const shift=new THREE.Vector3(p.forward,p.up,p.side);
 const around=(v:THREE.Vector3)=>v.clone().sub(fit.stock)
  .applyQuaternion(spin).add(fit.stock).add(shift);
 const rotation=new THREE.Euler().setFromQuaternion(
  spin.clone().multiply(new THREE.Quaternion()
   .setFromEuler(fit.rotation)),'XYZ');
 return {fit:{...fit,origin:around(fit.origin),rotation,
   stock:fit.stock.clone().add(shift),
   primary:around(fit.primary),support:around(fit.support)},cue};
}

/** B29 preview-only visible moving firearm controls (game-art geometry).
 * Unlike the gesture cue, this retains the HK handle in its notch until
 * magazine insertion, then releases it. No physical cycling of ammo.
 */
export type ReloadControlPose={
 visible:boolean;travel:number;press:number;
};
export function v4ReloadControlPose(
 mechanism:ReloadMechanism,mode:ReloadMode,progress:number
):ReloadControlPose{
 const t=clamp(progress),still={visible:false,travel:0,press:0};
 if(mode!=='emergency')return still;
 if(mechanism==='hk-roller'){
  if(t<.075||t>=.96)return still;
  const travel=t<.20?-2.15*ease((t-.075)/.125):
    t<.82?-2.15:
    t<.93?-2.15*(1-ease((t-.82)/.11)):0;
  return {visible:true,travel,press:0};
 }
 if(mechanism==='ak-rocking'){
  if(t<.82||t>=.96)return still;
  const phase=ease((t-.82)/.14);
  return {visible:true,travel:-1.45*Math.sin(phase*Math.PI),
   press:0};
 }
 if(mechanism==='ar-bolt-catch'){
  if(t<.82||t>=.96)return still;
  const phase=ease((t-.82)/.14);
  return {visible:true,travel:0,press:.72*Math.sin(phase*Math.PI)};
 }
 return still;
}
