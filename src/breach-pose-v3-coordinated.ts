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

const Y=new THREE.Vector3(0,1,0);
export const V3_TORSO_YAWS=Object.freeze([0,-.08,.08,-.16,.16] as const);
/** Parent-local chest-forward translation; no stretching of shoulder joints. */
export const V3_TORSO_LEANS=Object.freeze([0,.7,1.35] as const);
const SUPPORT_SAMPLES=Object.freeze([null,0,.3] as const);
export type CoordinatedRequest={
 fit:WeaponFit;weapon:WeaponId;configuration:WeaponConfiguration;
 shoulders:readonly [THREE.Vector3,THREE.Vector3];
 envelope:PoseClearanceEnvelope;mode:PoseConstraintMode;
 /** A released support palm follows its real interaction path, not furniture. */
 releasedSupportTarget?:THREE.Vector3;
};
export type CoordinatedResult={
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
export function weaponFitInTurnedChest(
 fit:WeaponFit,yaw:number,leanX=0):WeaponFit{
 const reverse=new THREE.Quaternion().setFromAxisAngle(Y,-yaw);
 const lean=new THREE.Vector3(leanX,0,0);
 // A chest-forward shift is canceled in its original local axes before
 // applying the inverse yaw. Both operations preserve every world socket.
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
 const yawSeeds=V3_TORSO_YAWS;
 for(const leanX of V3_TORSO_LEANS){
  const approvedBefore=validCandidates;
  // Lean is tried only when the neutral body cannot find a valid solution,
  // and secondary yaw samples are reduced to keep the candidate set finite.
  const yaws=leanX===0?yawSeeds:[0,-.08,.08];
  for(const yaw of yaws){
  // Transform all geometry in the new chest frame. Chest rotation+lean and
  // countertransformed rifle cancel in world; no ballistic path changes.
  const fit=weaponFitInTurnedChest(original,yaw,leanX);
  const right=solveV3DynamicArm({shoulder:req.shoulders[1],
   wrist:fit.primary,side:1,mode:req.mode,envelope:req.envelope,
   preferredPole:new THREE.Vector3(3,-9,1.5)});
  if(!right.solution){candidates+=req.releasedSupportTarget?1:SUPPORT_SAMPLES.length;continue;}
  const options=(!contacts||req.releasedSupportTarget?
    [null]:SUPPORT_SAMPLES) as readonly (number|null)[];
  for(const fraction of options){
   candidates++;
   let support=req.releasedSupportTarget?
    req.releasedSupportTarget.clone().sub(new THREE.Vector3(leanX,0,0))
      .applyAxisAngle(Y,-yaw):
    fit.support.clone();
   if(fraction!==null&&contacts){
    const local=supportContactAt(contacts.support,fraction);
    support=new THREE.Vector3(local.x*contacts.scale,local.y,local.z)
      .applyEuler(fit.rotation).add(fit.origin);
   }
   if(support.distanceTo(req.shoulders[0])>19.92)continue;
   const left=solveV3DynamicArm({shoulder:req.shoulders[0],
     wrist:support,side:-1,mode:req.mode,envelope:req.envelope,
     preferredPole:new THREE.Vector3(3,-9,-1.5)});
   if(!left.solution)continue;
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
   winning={status:'clear',fit:newFit,yaw,leanX,
    arms:[left.solution,right.solution],
    reports:[left.report,right.report],softScales:[left.softScale,right.softScale],
    supportFraction:fraction,candidates,validCandidates,quality:score};
  }
  }
  // No reason to prefer a strained forward lean when a lighter phase
  // already found a physically viable two-arm solution.
  if(validCandidates>approvedBefore)break;
 }
 return winning?{...winning,candidates,validCandidates}:{
  status:'unresolved',fit:original,yaw:0,leanX:0,arms:null,
  reports:null,softScales:null,supportFraction:null,candidates,validCandidates,quality:null};
}
