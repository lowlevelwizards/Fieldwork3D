/** WR6: explicit reversible transition state. The calling action owner
 * advances this at fixed steps; rendering only samples the recorded weight.
 * Changing between two stows returns through held, never jumps endpoints. */
import * as THREE from 'three';
import type {SlingKind} from './breach-weapon-retention.ts';
import {retentionPoseSupported,sampleRetentionPose,type RetentionPoseInput,
 type RetentionPoseMode,type RetentionPoseSample} from './breach-weapon-retention-pose.ts';
export type RetentionTransitionState=Readonly<{
 mode:RetentionPoseMode|null;desired:RetentionPoseMode|null;weight:number;
}>;
export const initialRetentionTransition=():RetentionTransitionState=>
 ({mode:null,desired:null,weight:0});
const clamp=(x:number)=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const smooth=(x:number)=>{const t=clamp(x);return t*t*(3-2*t);};
const duration=(mode:RetentionPoseMode)=>mode==='held-one'?.32:
 mode==='front-slung'?.58:mode==='side-slung'?.74:1.05;
export function requestRetentionTransition(state:RetentionTransitionState,
 desired:RetentionPoseMode|null,sling:SlingKind):RetentionTransitionState{
 if(desired&&!retentionPoseSupported(desired,sling))return state;
 return state.desired===desired?state:{...state,desired};
}
export function advanceRetentionTransition(state:RetentionTransitionState,
 dt:number,sling:SlingKind):RetentionTransitionState{
 const desired=state.desired&&retentionPoseSupported(state.desired,sling)?
  state.desired:null;
 let mode=state.mode,weight=clamp(state.weight);
 const step=Math.max(0,Math.min(.20,Number.isFinite(dt)?dt:0));
 if(!mode||weight===0){mode=desired;weight=0;}
 if(!mode)return initialRetentionTransition();
 // The current path remains sampled in reverse until the held endpoint.
 const forward=mode===desired;
 weight=clamp(weight+(forward?1:-1)*step/duration(mode));
 if(weight===0&&!forward)mode=null;
 return {mode,desired,weight};
}
export const retentionTransitionSettled=(s:RetentionTransitionState)=>
 s.mode===s.desired&&(s.mode?s.weight===1:s.weight===0);
/** Blend the one existing weapon along a body-local route. Source grip
 * contacts follow the rigid transform until the explicit release window.
 * No claim of gameplay acquisition: WR7+ supplies actual support/hand gates. */
export function sampleRetentionTransition(p:RetentionPoseInput,weight:number):RetentionPoseSample|null{
 const target=sampleRetentionPose(p);
 if(!target)return null;
 const t=clamp(weight);
 if(t===1)return target;
 const f=smooth(t);
 let position=p.heldPosition.clone().lerp(target.position,f);
 let quaternion=p.heldQuaternion.clone().slerp(target.quaternion,f);
 if(p.mode==='back-slung'){
  // Keep the gun outboard while transferring it around the torso instead
  // of interpolating straight through the chest.
  const side=sampleRetentionPose({...p,mode:'side-slung'});
  if(side){
   if(t<.5){
    const a=smooth(t*2);
    position=p.heldPosition.clone().lerp(side.position,a);
    quaternion=p.heldQuaternion.clone().slerp(side.quaternion,a);
   }else{
    const a=smooth((t-.5)*2);
    position=side.position.clone().lerp(target.position,a);
    position.z+=Math.sin(Math.PI*a)*5;
    quaternion=side.quaternion.clone().slerp(target.quaternion,a);
   }
  }
 }
 const follow=(grip:THREE.Vector3)=>grip.clone().sub(p.heldPosition)
  .applyQuaternion(p.heldQuaternion.clone().invert())
  .applyQuaternion(quaternion).add(position);
 const left=follow(p.supportGrip).lerp(target.left,smooth((t-.15)/.52));
 const right=p.mode==='held-one'?follow(p.primaryGrip):
  follow(p.primaryGrip).lerp(target.right,smooth((t-.58)/.42));
 return {mode:p.mode,position,quaternion,left,right};
}
