/** V3: time-independent, bounded coordinated torso + rifle contact search.
 * A compensating chest-local rigid transform keeps the rifle IDENTICAL in
 * world space as the chest rotates: no shot direction or muzzle translation.
 * No arbitrary hand stretch, rigid-contact relaxation or IK history.
 * Preview only until full action and mobile visual validation.
 */
import * as THREE from 'three';
import type {WeaponFit} from './breach-weapon-pose.ts';
import type {WeaponId} from './breach-combat.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {PoseClearanceEnvelope} from './breach-pose-clearance-envelope.ts';
import type {PoseConstraintMode,ArmConstraintReport} from './breach-pose-v3-constraints.ts';
import type {LimbSolution} from './breach-ik.ts';
import {riflePoseContacts,supportContactAt}
 from './breach-weapon-contact-zones.ts';
import {solveV3DynamicArm} from './breach-pose-v3-dynamic-arm.ts';

export const V3_TORSO_YAWS=Object.freeze([0,-.08,.08,-.16,.16] as const);
/** Parent-local chest-forward translation; no stretching of shoulder joints. */
export const V3_TORSO_LEANS=Object.freeze([0,.7,1.35] as const);
const SUPPORT_SAMPLES=Object.freeze([null,0,.3] as const);
export type CoordinatedRequest={
 fit:WeaponFit;weapon:WeaponId;configuration:WeaponConfiguration;
 shoulders:readonly [THREE.Vector3,THREE.Vector3];
 envelope:PoseClearanceEnvelope;mode:PoseConstraintMode;
 /** Source-of-truth current chest orientation including pitch/roll. */
 chestRotation?:THREE.Euler;
 /** A released support palm follows its real interaction path, not furniture. */
 releasedSupportTarget?:THREE.Vector3;
};
export type CoordinatedRejections={
 primaryReach:number;primaryClearance:number;
 supportReach:number;supportClearance:number;
};
export type CoordinatedResult={
 rejects:CoordinatedRejections;
 status:'clear'|'unresolved';
 fit:WeaponFit;
 yaw:number;
 leanX:number;
 arms:readonly [LimbSolution,LimbSolution]|null;
 reports:readonly [ArmConstraintReport,ArmConstraintReport]|null;
 softScales:readonly [number,number]|null;
 supportFraction:number|null;
 candidates:number;
 validCandidates:number;
 quality:number|null;
};
/** Transform a hand interaction target into an assisted chest frame.
 * This is the same rigid transformation used for the weapon itself.
 */
export function contactInAssistedChest(v:THREE.Vector3,
 yaw:number,leanX=0,baseRotation=new THREE.Euler()):THREE.Vector3{
 const before=new THREE.Quaternion().setFromEuler(baseRotation);
 const after=new THREE.Quaternion().setFromEuler(new THREE.Euler(
  baseRotation.x,baseRotation.y+yaw,baseRotation.z,baseRotation.order));
 const relative=after.invert().multiply(before);
 return v.clone().sub(new THREE.Vector3(leanX,0,0))
  .applyQuaternion(relative);
}
export function weaponFitInTurnedChest(
 fit:WeaponFit,yaw:number,leanX=0,baseRotation=new THREE.Euler()):WeaponFit{
 // Euler XYZ contains pitch/roll as well as yaw. Simply subtracting yaw
 // from the rifle does NOT counter the real chest rotation under lean.
 // Qrelative = inverse(QnewChest) * QoldChest is the exact rigid mapping.
 const before=new THREE.Quaternion().setFromEuler(baseRotation);
 const after=new THREE.Quaternion().setFromEuler(new THREE.Euler(
  baseRotation.x,baseRotation.y+yaw,baseRotation.z,baseRotation.order));
 const reverse=after.invert().multiply(before);
 const lean=new THREE.Vector3(leanX,0,0);
 const rotate=(v:THREE.Vector3)=>v.clone().sub(lean).applyQuaternion(reverse);
 const q=reverse.clone().multiply(
  new THREE.Quaternion().setFromEuler(fit.rotation));
 return {...fit,origin:rotate(fit.origin),
  rotation:new THREE.Euler().setFromQuaternion(q,'XYZ'),
  stock:rotate(fit.stock),primary:rotate(fit.primary),
  support:rotate(fit.support)};
}
export function solveV3CoordinatedPose(req:CoordinatedRequest):CoordinatedResult{
 const contacts=riflePoseContacts(req.weapon,req.configuration);
 const original=req.fit;
 let winning:CoordinatedResult|null=null;
 let best=Infinity,candidates=0,validCandidates=0;
 const rejects:CoordinatedRejections={
  primaryReach:0,primaryClearance:0,
  supportReach:0,supportClearance:0
 };
 const yawSeeds=V3_TORSO_YAWS;
 for(const leanX of V3_TORSO_LEANS){
  const approvedBefore=validCandidates;
  // Lean is tried only when the neutral body cannot find a valid solution,
  // and secondary yaw samples are reduced to keep the candidate set finite.
  const yaws=leanX===0?yawSeeds:[0,-.08,.08];
  for(const yaw of yaws){
  // Transform all geometry in the new chest frame. Chest rotation+lean and
  // countertransformed rifle cancel in world; no ballistic path changes.
  const fit=weaponFitInTurnedChest(original,yaw,leanX,req.chestRotation);
  const right=solveV3DynamicArm({shoulder:req.shoulders[1],
   wrist:fit.primary,side:1,mode:req.mode,envelope:req.envelope,
   preferredPole:new THREE.Vector3(3,-9,1.5)});
  if(!right.solution){
   rejects[right.reason==='out-of-reach'?'primaryReach':
     'primaryClearance']++;
   candidates+=req.releasedSupportTarget?1:SUPPORT_SAMPLES.length;
   continue;
  }
  const options=(!contacts||req.releasedSupportTarget?
    [null]:SUPPORT_SAMPLES) as readonly (number|null)[];
  for(const fraction of options){
   candidates++;
   let support=req.releasedSupportTarget?
    contactInAssistedChest(req.releasedSupportTarget,yaw,leanX,
      req.chestRotation):
    fit.support.clone();
   if(fraction!==null&&contacts){
    const local=supportContactAt(contacts.support,fraction);
    support=new THREE.Vector3(local.x*contacts.scale,local.y,local.z)
      .applyEuler(fit.rotation).add(fit.origin);
   }
   if(support.distanceTo(req.shoulders[0])>19.92){
    rejects.supportReach++;continue;
   }
   const left=solveV3DynamicArm({shoulder:req.shoulders[0],
     wrist:support,side:-1,mode:req.mode,envelope:req.envelope,
     preferredPole:new THREE.Vector3(3,-9,-1.5)});
   if(!left.solution){
    rejects[left.reason==='out-of-reach'?'supportReach':
      'supportClearance']++;continue;
   }
   validCandidates++;
   const stockDrift=fit.stock.distanceTo(original.stock);
   const score=right.report.quality+left.report.quality+
     Math.abs(yaw)*1.8+stockDrift*.18+leanX*.60+
     support.distanceTo(fit.support)*.09;
   if(score>=best-1e-8)continue;
   best=score;
   const newFit={...fit,support,
     // A released support hand is not a firearm attachment.
     twoHanded:req.releasedSupportTarget?false:true,
     primaryReachable:true,contactError:0};
   winning={status:'clear',fit:newFit,yaw,leanX,rejects,
    arms:[left.solution,right.solution],
    reports:[left.report,right.report],softScales:[left.softScale,right.softScale],
    supportFraction:fraction,candidates,validCandidates,quality:score};
  }
  }
  // No reason to prefer a strained forward lean when a lighter phase
  // already found a physically viable two-arm solution.
  if(validCandidates>approvedBefore)break;
 }
 return winning?{...winning,candidates,validCandidates,
  rejects:{...rejects}}:{
  status:'unresolved',fit:original,yaw:0,leanX:0,arms:null,
  rejects:{...rejects},
  reports:null,softScales:null,supportFraction:null,candidates,validCandidates,quality:null};
}
