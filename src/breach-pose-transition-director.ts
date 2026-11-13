/** Single owner for handling and carry pose transitions.
 * Action clocks remain simulation-owned; this module samples the visible
 * cross-fade and controls its history. Never writes limb/weapon transforms
 * or ballistics. Deterministic replay does not consume render history.
 */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import type {Handling,WeaponFit} from './breach-weapon-pose.ts';
import {handlingProfile,type HandlingProfile} from './breach-handling-profiles.ts';
import {blendedHandlingProfile,type HandlingTransition}
 from './breach-handling-transition.ts';
import {interpolateWeaponCarry,lowReadyBlendPhase}
 from './breach-low-ready-transition.ts';

export type HandlingSample={
 active:HandlingTransition|undefined;
 authoredLabSwitch:boolean;profile:HandlingProfile;
};
export function sampleHandlingTransition(
 r:OperatorRig,p:OperatorPose,handling:Handling):HandlingSample{
 // Presentation-only time keeps transitions moving during tactical pause.
 // Simulation action clocks and replay time are never advanced here.
 const visualSeconds=p.deterministic?p.seconds:
   p.idleLifeSeconds??p.seconds;
 // Active aim and ordinary firing still need a visual transition.
 // Shot-time muzzle and projectile headings remain simulation-owned.
 // Clearance blends are deterministic, distance-sampled and already
 // shared with muzzleAtShot. Do not stack a second live time-bridge.
 const passiveBlend=!p.deterministic&&!p.handlingOverride&&
   p.clearanceCarry===undefined&&!p.down&&!p.surrender;
 if(!p.handlingOverride&&handling!==r.lastHandling){
   if(passiveBlend&&r.lastHandling){
     r.autoHandling={from:r.lastHandling,to:handling,alpha:0,
       at:visualSeconds,
       // Physically blocked short stock responds quickly, but is no
       // longer a one-frame elbow teleport. Urgent aim also stays sharp.
       duration:(handling==='short'||r.lastHandling==='short')?.15:
         (p.aiming||p.firing)?.18:.26,
       fromProfile:r.handlingProfile??handlingProfile(r.lastHandling,p.weapon),
       fromWeapon:{origin:r.weapon.position.clone(),
         rotation:r.weapon.rotation.clone()}};
   }else r.autoHandling=null;
   r.lastHandling=handling;r.lastHandlingAt=p.seconds;
 }
 const auto=r.autoHandling&&passiveBlend?{
   // Keep a LINEAR time phase; each presentation channel applies the
   // same ease once, avoiding unintentional double-smooth pauses.
   ...r.autoHandling,alpha:Math.max(0,Math.min(1,
     (visualSeconds-r.autoHandling.at)/(r.autoHandling.duration??.26)))}:undefined;
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
 lastExplicitHandling:Handling|null;
 from:WeaponFit|null;fromBends:[THREE.Vector3,THREE.Vector3]|null;
 fromHands:[THREE.Vector3,THREE.Vector3]|null;
 started:number;duration:number;lastSeconds:number;
};
const carryStates=new WeakMap<OperatorRig,CarryBlendState>();
export type CarryTransitionSample={
 fit:WeaponFit;active:boolean;alpha:number;
 bends:[THREE.Vector3,THREE.Vector3]|null;
 hands:[THREE.Vector3,THREE.Vector3]|null;
};
export function sampleCarryTransition(r:OperatorRig,p:OperatorPose,
 fit:WeaponFit,coupled:boolean):CarryTransitionSample{
 let active=false,alpha=1;
 let bends:[THREE.Vector3,THREE.Vector3]|null=null;
 let hands:[THREE.Vector3,THREE.Vector3]|null=null;
 if(!p.deterministic&&!p.down&&!p.surrender){
   let bridge=carryStates.get(r);
   if(!bridge){
     bridge={lastCoupled:coupled,lastFit:null,lastWeapon:null,
       lastExplicitHandling:p.handlingOverride??null,
       from:null,fromBends:null,fromHands:null,
       started:p.seconds,duration:.25,lastSeconds:p.seconds};
     carryStates.set(r,bridge);
   }
   if(p.seconds<bridge.lastSeconds-.01||
      p.seconds-bridge.lastSeconds>1.2||
      bridge.lastWeapon!==null&&bridge.lastWeapon!==p.weapon){
     bridge.from=null;bridge.fromBends=null;bridge.fromHands=null;
     bridge.lastFit=null;bridge.lastCoupled=coupled;
     bridge.lastExplicitHandling=p.handlingOverride??null;
   }
   // Preserve the actual last presented weapon and both hands when the
   // Lab directly changes its named mode. Live automatic selection uses
   // its existing single transition director; do not double-blend it.
   const directSwitch=!!p.handlingOverride&&!p.handlingTransition&&
     bridge.lastExplicitHandling!==null&&
     bridge.lastExplicitHandling!==p.handlingOverride;
   if(bridge.lastFit&&(bridge.lastCoupled!==coupled||directSwitch)){
     bridge.from=bridge.lastFit;
     bridge.fromBends=[r.arms[0].bend.clone(),r.arms[1].bend.clone()];
     bridge.fromHands=[r.arms[0].hand.position.clone(),
       r.arms[1].hand.position.clone()];
     bridge.started=p.seconds;
     bridge.duration=coupled?.34:.24;
   }
   bridge.lastCoupled=coupled;
   bridge.lastExplicitHandling=p.handlingOverride??null;
   bridge.lastWeapon=p.weapon;
   bridge.lastSeconds=p.seconds;
   if(bridge.from){
     const t=(p.seconds-bridge.started)/bridge.duration;
     if(t>=1){
       bridge.from=null;bridge.fromBends=null;bridge.fromHands=null;
     }else{
       active=true;
       alpha=lowReadyBlendPhase(t);
       bends=bridge.fromBends;
       hands=bridge.fromHands;
       fit=interpolateWeaponCarry(bridge.from,fit,t);
     }
   }
   bridge.lastFit=fit;
 }
 return {fit,active,alpha,bends,hands};
}
