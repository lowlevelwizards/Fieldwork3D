/** Single owner for handling and carry pose transitions.
 * Action clocks remain simulation-owned; this module samples the visible
 * cross-fade and controls its history. Never writes limb/weapon transforms
 * or ballistics. Deterministic replay does not consume render history.
 */
import * as THREE from 'three';
import type {OperatorRig,OperatorPose} from './breach-operator-rig.ts';
import type {Handling,WeaponFit} from './breach-weapon-pose.ts';
import {handlingProfile,type HandlingProfile} from './breach-handling-profiles.ts';
import {blendedHandlingProfile,smoothHandling,type HandlingTransition}
 from './breach-handling-transition.ts';
import {interpolateWeaponCarry,lowReadyBlendPhase}
 from './breach-low-ready-transition.ts';

export type HandlingSample={
 active:HandlingTransition|undefined;
 authoredLabSwitch:boolean;profile:HandlingProfile;
};
export function sampleHandlingTransition(
 r:OperatorRig,p:OperatorPose,handling:Handling):HandlingSample{
 const passiveBlend=!p.deterministic&&!p.handlingOverride&&
   !p.aiming&&!p.firing&&!p.down&&!p.surrender;
 if(!p.handlingOverride&&handling!==r.lastHandling){
   if(passiveBlend&&r.lastHandling){
     r.autoHandling={from:r.lastHandling,to:handling,alpha:0,
       at:p.seconds,
       fromProfile:r.handlingProfile??handlingProfile(r.lastHandling,p.weapon),
       fromWeapon:{origin:r.weapon.position.clone(),
         rotation:r.weapon.rotation.clone()}};
   }else r.autoHandling=null;
   r.lastHandling=handling;r.lastHandlingAt=p.seconds;
 }
 const auto=r.autoHandling&&passiveBlend?{
   ...r.autoHandling,alpha:smoothHandling(
     (p.seconds-r.autoHandling.at)/.24)}:undefined;
 if(!passiveBlend)r.autoHandling=null;
 if(auto&&auto.alpha>=1)r.autoHandling=null;
 const active=p.handlingTransition??auto;
 const authoredLabSwitch=!!p.poseV3Preview&&
   !!p.handlingTransition?.authoredFrom&&!!p.handlingOverride&&
   !p.down&&!p.surrender&&p.reload<=0;
 const profile=active?
   blendedHandlingProfile(active.from,active.to,active.alpha,p.weapon,
     active.fromProfile):handlingProfile(handling,p.weapon);
 return {active,authoredLabSwitch,profile};
}

type CarryBlendState={
 lastCoupled:boolean;lastFit:WeaponFit|null;lastWeapon:string|null;
 from:WeaponFit|null;fromBends:[THREE.Vector3,THREE.Vector3]|null;
 started:number;duration:number;lastSeconds:number;
};
const carryStates=new WeakMap<OperatorRig,CarryBlendState>();
export type CarryTransitionSample={
 fit:WeaponFit;active:boolean;alpha:number;
 bends:[THREE.Vector3,THREE.Vector3]|null
};
export function sampleCarryTransition(r:OperatorRig,p:OperatorPose,
 fit:WeaponFit,coupled:boolean):CarryTransitionSample{
 let active=false,alpha=1;
 let bends:[THREE.Vector3,THREE.Vector3]|null=null;
 if(!p.deterministic&&!p.down&&!p.surrender){
   let bridge=carryStates.get(r);
   if(!bridge){
     bridge={lastCoupled:coupled,lastFit:null,lastWeapon:null,
       from:null,fromBends:null,started:p.seconds,duration:.25,
       lastSeconds:p.seconds};
     carryStates.set(r,bridge);
   }
   if(p.seconds<bridge.lastSeconds-.01||
      p.seconds-bridge.lastSeconds>1.2||
      bridge.lastWeapon!==null&&bridge.lastWeapon!==p.weapon){
     bridge.from=null;bridge.fromBends=null;
     bridge.lastFit=null;bridge.lastCoupled=coupled;
   }
   if(bridge.lastFit&&bridge.lastCoupled!==coupled){
     bridge.from=bridge.lastFit;
     bridge.fromBends=[r.arms[0].bend.clone(),r.arms[1].bend.clone()];
     bridge.started=p.seconds;
     bridge.duration=coupled?.34:.22;
   }
   bridge.lastCoupled=coupled;
   bridge.lastWeapon=p.weapon;
   bridge.lastSeconds=p.seconds;
   if(bridge.from){
     const t=(p.seconds-bridge.started)/bridge.duration;
     if(t>=1){bridge.from=null;bridge.fromBends=null;}
     else{
       active=true;
       alpha=lowReadyBlendPhase(t);
       bends=bridge.fromBends;
       fit=interpolateWeaponCarry(bridge.from,fit,t);
     }
   }
   bridge.lastFit=fit;
 }
 return {fit,active,alpha,bends};
}
