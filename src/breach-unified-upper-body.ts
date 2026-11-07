/** Unified upper-body fitting/cache authority.
 * Coupled low-ready, paired coordinated solving and support-grip choice
 * are specialized strategies under one owner, never separate rig writers.
 * Every cache key includes the complete relevant pose, assembly and
 * equipment state. No quantized continuous aiming and no render history.
 */
import * as THREE from 'three';
import {solveTwoBone,ARM_LIMITS,intersectsTorso,
 type LimbSolution} from './breach-ik.ts';
import {armorArmIntrusion,armorElbowPole}
 from './breach-arm-armor-clearance.ts';
import {lowReadyFamilyFit,lowReadyElbowPole}
 from './breach-low-ready-family-fit.ts';
import {evaluateSleeveArmorContact}
 from './breach-pose-clearance-envelope.ts';
import {solveV3DynamicArm,type DynamicArmFit}
 from './breach-pose-v3-dynamic-arm.ts';
import type {OperatorPoseScratch} from './breach-operator-pose-scratch.ts';
import type {PoseConstraintMode} from './breach-pose-v3-constraints.ts';

import type {WeaponId} from './breach-combat.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {PoseClearanceEnvelope} from './breach-pose-clearance-envelope.ts';
import {solveCoupledLowReady,type CoupledLowReadySolution}
 from './breach-coupled-low-ready.ts';
import {solveV3CoordinatedPose,type CoordinatedRequest,
 type CoordinatedResult} from './breach-pose-v3-coordinated.ts';
import {chooseV3SupportGrip,type SupportGripRequest,
 type SupportGripChoice} from './breach-pose-v3-support-grip.ts';

export type CoupledFitRequest={
 weapon:WeaponId;configuration:WeaponConfiguration;
 envelope:PoseClearanceEnvelope;
 shoulders:[THREE.Vector3,THREE.Vector3];
 localYaw:number;poseWeight:number;allowVisualOverlap:boolean;
};
export type FitReuse<T>={
 result:T;cached:boolean;source:'rig'|'shared'|'fresh'
};
const perRigCoupled=new WeakMap<object,{
 key:string;solution:CoupledLowReadySolution|null
}>();
const sharedCoupled=new Map<string,CoupledLowReadySolution|null>();
export const MAX_SHARED_IDLE_FITS=80;
const perRigCoordinated=new WeakMap<object,{
 key:string;result:CoordinatedResult
}>();
const perRigSupport=new WeakMap<object,{
 key:string;result:SupportGripChoice
}>();

/** Preserve the approved low-ready fit lattice until visual parity tests
 * approve its replacement: 4-decimal local yaw, 3-decimal shoulders. */
export function cachedCoupledUpperBody(rig:object,p:CoupledFitRequest,
 cachePerActor=true):FitReuse<CoupledLowReadySolution|null>{
 const key=JSON.stringify([p.weapon,p.configuration.build,
   p.configuration.slots,p.envelope.top,p.envelope.armor,p.envelope.rig,
   p.poseWeight,Number(p.localYaw.toFixed(4)),p.allowVisualOverlap,
   p.shoulders.map(v=>v.toArray().map(n=>Number(n.toFixed(3))))]);
 const local=perRigCoupled.get(rig);
 if(local?.key===key)
   return {result:local.solution,cached:true,source:'rig'};
 const hit=sharedCoupled.has(key);
 let result:CoupledLowReadySolution|null;
 if(hit)result=sharedCoupled.get(key)??null;
 else{
   result=solveCoupledLowReady({
     weapon:p.weapon,configuration:p.configuration,
     armor:p.envelope,shoulders:p.shoulders,
     nominalYaw:p.localYaw,
     allowVisualOverlap:p.allowVisualOverlap
   });
   sharedCoupled.set(key,result);
   if(sharedCoupled.size>MAX_SHARED_IDLE_FITS){
     const oldest=sharedCoupled.keys().next().value;
     if(oldest!==undefined)sharedCoupled.delete(oldest);
   }
 }
 if(cachePerActor)perRigCoupled.set(rig,{key,solution:result});
 return {result,cached:hit,source:hit?'shared':'fresh'};
}
export function cachedCoordinatedUpperBody(rig:object,p:CoordinatedRequest):
 FitReuse<CoordinatedResult>{
 const fit=p.fit;
 const key=JSON.stringify([p.weapon,p.configuration,
   p.envelope.armor,p.envelope.rig,p.envelope.top,
   fit.origin.toArray(),fit.rotation.toArray(),
   fit.stock.toArray(),fit.primary.toArray(),fit.support.toArray(),
   p.shoulders.map(v=>v.toArray()),
   (p.chestRotation??new THREE.Euler()).toArray(),
   p.releasedSupportTarget?.toArray()??null,p.mode,
   !!p.allowReloadOverlap,!!p.allowVisualOverlap]);
 const cached=perRigCoordinated.get(rig);
 if(cached?.key===key)
   return {result:cached.result,cached:true,source:'rig'};
 const result=solveV3CoordinatedPose(p);
 perRigCoordinated.set(rig,{key,result});
 return {result,cached:false,source:'fresh'};
}
export function cachedSupportUpperBody(rig:object,p:SupportGripRequest):
 FitReuse<SupportGripChoice>{
 const fit=p.fit;
 const key=JSON.stringify([p.weapon,p.configuration,
   p.envelope.armor,p.envelope.rig,p.envelope.top,
   fit.origin.toArray(),fit.rotation.toArray(),
   fit.stock.toArray(),fit.primary.toArray(),fit.support.toArray(),
   p.shoulder.toArray(),p.firingShoulder.toArray(),p.mode]);
 const cached=perRigSupport.get(rig);
 if(cached?.key===key)
   return {result:cached.result,cached:true,source:'rig'};
 const result=chooseV3SupportGrip(p);
 perRigSupport.set(rig,{key,result});
 return {result,cached:false,source:'fresh'};
}

/** One fallback arm solver. It first retains the interpolated pole where
 * valid, then tries finite equipment-aware candidates. The historical
 * simple armor retry is a last-resort compatibility strategy, never a
 * second renderer writer. This keeps the current silhouettes until the
 * full OBB replacement's visual-parity gate passes.
 */
export type FallbackArmRequest={
 shoulder:THREE.Vector3;wrist:THREE.Vector3;desired:THREE.Vector3;
 preferredPole:THREE.Vector3;previousBend:THREE.Vector3;
 side:-1|1;neutral:boolean;down:boolean;surrender:boolean;
 firing:boolean;sourceContinuity:boolean;
 envelope:PoseClearanceEnvelope|null;
 mode:PoseConstraintMode;allowVisualOverlap:boolean;
 curatedSupport:boolean;
 familyLow:ReturnType<typeof lowReadyFamilyFit>;
 /** Existing last-resort front approximation; not simulation physics. */
 legacyFront:number;
 scratch:OperatorPoseScratch;
 armIndex:0|1;
};
export type FallbackArmResult={
 solution:LimbSolution;dynamic:DynamicArmFit|null;
 used:'authored'|'dynamic'|'legacy'|'generic'
};
export function solveUnifiedFallbackArm(req:FallbackArmRequest):
 FallbackArmResult{
 const {shoulder,wrist,desired,preferredPole,previousBend,
   side,envelope,scratch,armIndex}=req;
 let solved=solveTwoBone(shoulder,wrist,10,10,preferredPole,
   ARM_LIMITS,req.neutral?undefined:previousBend,
   scratch.arms[armIndex]);
 let dynamicAccepted=false;
 if(req.sourceContinuity&&envelope&&solved.reached){
   dynamicAccepted=evaluateSleeveArmorContact(shoulder,
     solved.joint,solved.effector,envelope).valid;
 }
 if(dynamicAccepted)
   return {solution:solved,dynamic:null,used:'authored'};
 let dynamic:DynamicArmFit|null=null;
 if(envelope&&!req.neutral&&!req.down&&!req.surrender&&!req.firing){
   dynamic=solveV3DynamicArm({
     shoulder,wrist:desired,side,mode:req.mode,
     envelope,preferredPole,
     // During interruption, prefer the existing visible elbow among
     // equally valid OBB candidates; never infer a new random pole.
     referenceBend:req.sourceContinuity?req.previousBend:undefined,
     allowVisualOverlap:req.allowVisualOverlap
   });
   if(dynamic.solution)
     return {solution:dynamic.solution,dynamic,used:'dynamic'};
 }
 if(!req.neutral&&!req.down&&!req.surrender){
   const score=(candidate:LimbSolution)=>armorArmIntrusion(
     shoulder,candidate.joint,candidate.effector,req.legacyFront)+
     (intersectsTorso(candidate.joint,.25)?2.5:0);
   let bestScore=score(solved);
   if(bestScore>.04){
     const pole0=req.curatedSupport&&req.familyLow?
       lowReadyElbowPole(shoulder,req.familyLow,1):
       armorElbowPole(shoulder,side,0);
     const retry=solveTwoBone(shoulder,wrist,10,10,
       new THREE.Vector3(pole0.x,pole0.y,pole0.z),
       ARM_LIMITS,previousBend,scratch.armRetry[armIndex]);
     const retryScore=score(retry);
     if(retryScore+.015<bestScore){solved=retry;bestScore=retryScore;}
     const pole1=armorElbowPole(shoulder,side,1);
     const alternate=solveTwoBone(shoulder,wrist,10,10,
       new THREE.Vector3(pole1.x,pole1.y,pole1.z),
       ARM_LIMITS,previousBend,scratch.armFallback[armIndex]);
     const alternateScore=score(alternate);
     if(alternateScore+.015<bestScore){
       solved=alternate;bestScore=alternateScore;
     }
     return {solution:solved,dynamic,used:'legacy'};
   }
 }
 return {solution:solved,dynamic,used:'generic'};
}
