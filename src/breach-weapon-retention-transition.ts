/** WR6: explicit reversible transition state. The calling action owner
 * advances this at fixed steps; rendering only samples the recorded weight.
 * Changing between two stows returns through held, never jumps endpoints. */
import * as THREE from 'three';
import type {SlingKind} from './breach-weapon-retention.ts';
import {retentionPoseSupported,sampleRetentionPose,retainedSwing,type RetentionPoseInput,
 type RetentionPoseMode,type RetentionPoseSample} from './breach-weapon-retention-pose.ts';
export type RetentionTransitionState=Readonly<{
 mode:RetentionPoseMode|null;desired:RetentionPoseMode|null;weight:number;
}>;
export const initialRetentionTransition=():RetentionTransitionState=>
 ({mode:null,desired:null,weight:0});
const clamp=(x:number)=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const smooth=(x:number)=>{const t=clamp(x);return t*t*(3-2*t);};
/** Same release fraction for wrist, elbow and hand orientation. */
export function retentionHandRelease(mode:RetentionPoseMode,side:-1|1,t:number){
 if(mode==='held-one')return side===-1?smooth((t-.10)/.48):0;
 if(mode==='front-slung')return side===-1?smooth((t-.035)/.26):
  smooth((t-.12)/.34);
 // Release the free arms before the weapon moves around the body.
 return side===-1?smooth((t-.04)/.30):smooth((t-.16)/.34);
}
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
/** A short, accelerating fall with a long soft landing. The final
 * third is reserved for damped settling, without changing action timing. */
export function frontDropPhase(weight:number){
 const t=clamp(weight),u=clamp(t/.70);
 return u*u*(3-2*u);
}
export function frontDropRebound(weight:number){
 const u=clamp((weight-.52)/.48);
 // Zero position and velocity at endpoints; one strong compression
 // followed by a smaller rebound, then no residual at the settled state.
 return -Math.sin(2*Math.PI*u)*Math.sin(Math.PI*u)**2*(1-u);
}
export function sampleRetentionTransition(p:RetentionPoseInput,weight:number):RetentionPoseSample|null{
 const target=sampleRetentionPose(p);
 if(!target)return null;
 const t=clamp(weight);
 if(t===1)return target;
 const f=smooth(t);
 let position=p.heldPosition.clone().lerp(target.position,f);
 let quaternion=p.heldQuaternion.clone().slerp(target.quaternion,f);
 if(p.mode==='front-slung'){
  // A drop leads with the vertical motion; no intermediate flipped pose.
  const fall=frontDropPhase(t);
  position=p.heldPosition.clone().lerp(target.position,fall);
  const bounce=frontDropRebound(t);
  const strength=Math.max(0,Math.min(1.5,p.motion?.strength??1));
  const drop=Math.min(1.45,Math.abs(target.position.y-p.heldPosition.y)*.20+.45);
  const dy=bounce*drop*strength;
  // Do not bounce through the floor, even when crouched.
  const groundGap=p.bounds?Math.max(0,p.bounds.clone().applyMatrix4(
   new THREE.Matrix4().compose(target.position,target.quaternion,p.scale)).min.y+p.chestHeight-2):1;
  position.y+=Math.max(-groundGap,dy);
  position.x+=Math.sin(Math.PI*t)**2*.18+Math.max(0,-bounce)*.46*strength;
  // Swing along the muzzle axis first, then settle roll toward the
  // stable outward-facing attachment plane. At neither endpoint is
  // the held weapon replaced or its source grip moved independently.
  const fromAxis=new THREE.Vector3(1,0,0).applyQuaternion(p.heldQuaternion);
  const toAxis=new THREE.Vector3(1,0,0).applyQuaternion(target.quaternion);
  const axisArc=new THREE.Quaternion().setFromUnitVectors(fromAxis,toAxis);
  const partial=new THREE.Quaternion().slerp(axisArc,fall);
  const currentAxis=fromAxis.clone().applyQuaternion(partial).normalize();
  const swing=retainedSwing(p.heldQuaternion,currentAxis);
  const targetAtAxis=retainedSwing(target.quaternion,currentAxis);
  quaternion=swing.slerp(targetAtAxis,smooth((t-.07)/.66));
  quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),bounce*.14*strength));
 }else if(p.mode==='side-slung'){
  // Keep the silhouette in front of the torso until it has moved outboard.
  position.x+=Math.sin(Math.PI*t)**2*1.5;
  position.z+=Math.sin(Math.PI*t)**2*1.1;
 }else if(p.mode==='back-slung'){
  // Keep the gun outboard while transferring it around the torso instead
  // of interpolating straight through the chest.
  const side=sampleRetentionPose({...p,mode:'side-slung'});
  if(side){
   if(t<.5){
    const a=smooth(t*2);
    position=p.heldPosition.clone().lerp(side.position,a);
    position.x+=Math.sin(Math.PI*a)**2*1.5;
    position.z+=Math.sin(Math.PI*a)**2*1.1;
    quaternion=p.heldQuaternion.clone().slerp(side.quaternion,a);
   }else{
    const a=smooth((t-.5)*2);
    position=side.position.clone().lerp(target.position,a);
    position.z+=Math.sin(Math.PI*a)**2*5;
    quaternion=side.quaternion.clone().slerp(target.quaternion,a);
   }
  }
 }
 const follow=(grip:THREE.Vector3)=>grip.clone().sub(p.heldPosition)
  .applyQuaternion(p.heldQuaternion.clone().invert())
  .applyQuaternion(quaternion).add(position);
 const left=follow(p.supportGrip).lerp(target.left,retentionHandRelease(p.mode,-1,t));
 const right=follow(p.primaryGrip).lerp(target.right,retentionHandRelease(p.mode,1,t));
 return {mode:p.mode,position,quaternion,left,right};
}
