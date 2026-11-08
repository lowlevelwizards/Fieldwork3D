/** Unified upper-body fitting/cache authority.
 * Coupled low-ready, paired coordinated solving and support-grip choice
 * are specialized strategies under one owner, never separate rig writers.
 * Every cache key includes the complete relevant pose, assembly and
 * equipment state. No quantized continuous aiming and no render history.
 */
import * as THREE from 'three';
import {solveTwoBone,ARM_LIMITS,intersectsTorso,
 type LimbSolution} from './breach-ik.ts';
import {anatomicalElbowCost,carryElbowViolation}
 from './breach-anatomy.ts';
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
 /** Live strafe uses previous rendered bend, replay always uses pose time. */
 liveContinuity?:boolean;
 outboardFiring?:boolean;
 transitionPhase?:number;
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
 // A collision-free pose cannot escape through the back of the shoulder.
 // All paths, including the early continuity/preview exits, use the same
 // bounded forward/down hemisphere. Re-solve exact bone lengths: do not
 // move an already solved elbow independently of the wrist.
 const finish=(solution:LimbSolution,dynamic:DynamicArmFit|null,
   used:FallbackArmResult['used']):FallbackArmResult=>{
   if(req.neutral||req.down||req.surrender||
      (req.mode!=='carry'&&req.mode!=='aim'))
     return {solution,dynamic,used};
   const measure=(limb:LimbSolution)=>
     carryElbowViolation(shoulder,limb.joint,side);
   if(measure(solution)<.001)return {solution,dynamic,used};
   let best=solution,bestScore=measure(solution)*100+
     anatomicalElbowCost(shoulder,solution.joint,solution.effector,
       side,req.outboardFiring);
   const poles:readonly [number,number,number][]=[
     [5,-9,side*1.2],[7,-7,side*.7],
     [4,-9,side*3],[6,-6,side*2],[3,-7,side*.25]
   ];
   for(const [x,y,z] of poles){
     const candidate=solveTwoBone(shoulder,wrist,10,10,
       new THREE.Vector3(x,y,z),ARM_LIMITS);
     if(!candidate.reached)continue;
     const score=measure(candidate)*100+
       anatomicalElbowCost(shoulder,candidate.joint,
         candidate.effector,side,req.outboardFiring)+
       armorArmIntrusion(shoulder,candidate.joint,candidate.effector,
         req.legacyFront)*.08;
     if(score<bestScore-.001){best=candidate;bestScore=score;}
   }
   return {solution:best,dynamic,used};
 };
 // Lab-only authored retargets must not snap between discrete
 // finite candidate families halfway through a pose. Use one smooth pole
 // throughout the blend, with a bounded, continuous outboard correction
 // for hard/soft gear contact. Never lerp elbow positions (which would
 // stretch 10+10 anatomy); re-solve full IK at each sampled timestamp.
 // The correction fades to zero at the destination, which is solved by
 // the settled coordinated/paired arm authority. Strict contact audit
 // still evaluates the original discrete admissibility policy below.
 if(req.sourceContinuity&&req.allowVisualOverlap&&envelope&&solved.reached){
   const phase=Math.max(0,Math.min(1,req.transitionPhase??.5));
   const envelopeWeight=Math.sin(Math.PI*phase);
   const pole=preferredPole.clone().normalize();
   for(let iter=0;iter<3;iter++){
     const report=evaluateSleeveArmorContact(
       shoulder,solved.joint,solved.effector,envelope);
     let rigid=0,soft=0;
     for(const contact of report.contacts){
       const exceed=Math.max(contact.upperExcess,contact.lowerExcess);
       if(contact.material==='rigid')rigid=Math.max(rigid,exceed);
       else soft=Math.max(soft,exceed);
     }
     // Each correction is proportional to actual penetration, with no
     // discontinuous "if valid, switch pose family" branch.
     const correction=Math.min(1.7,rigid*.45+soft*.16)*envelopeWeight;
     if(correction<=1e-6)continue;
     pole.x+=correction*.27;
     pole.y-=correction*.20;
     pole.z+=side*correction;
     pole.normalize();
     solved=solveTwoBone(shoulder,wrist,10,10,pole,ARM_LIMITS,
       previousBend,scratch.arms[armIndex]);
   }
   return finish(solved,null,'authored');
 }
 let dynamicAccepted=false;
 if(req.sourceContinuity&&envelope&&solved.reached){
   dynamicAccepted=evaluateSleeveArmorContact(shoulder,
     solved.joint,solved.effector,envelope).valid;
 }
 if(dynamicAccepted)
   return finish(solved,null,'authored');
 let dynamic:DynamicArmFit|null=null;
 if(envelope&&!req.neutral&&!req.down&&!req.surrender&&!req.firing){
   dynamic=solveV3DynamicArm({
     shoulder,wrist:desired,side,mode:req.mode,
     envelope,preferredPole,
     // During interruption, prefer the existing visible elbow among
     // equally valid OBB candidates; never infer a new random pole.
     referenceBend:req.sourceContinuity||req.liveContinuity?
       req.previousBend:undefined,
     continuityBias:req.liveContinuity?2.1:0,
     outboardFiring:req.outboardFiring,
     allowVisualOverlap:req.allowVisualOverlap
   });
   if(dynamic.solution)
     return finish(dynamic.solution,dynamic,'dynamic');
 }
 if(!req.neutral&&!req.down&&!req.surrender){
   const score=(candidate:LimbSolution)=>armorArmIntrusion(
     shoulder,candidate.joint,candidate.effector,req.legacyFront)+
     (intersectsTorso(candidate.joint,.25)?2.5:0)+
     (req.mode==='carry'||req.mode==='aim'?
       anatomicalElbowCost(shoulder,candidate.joint,candidate.effector,
         side,req.outboardFiring):0);
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
     return finish(solved,dynamic,'legacy');
   }
 }
 return finish(solved,dynamic,'generic');
}

/** Smooth a bend direction ON the 10+10 arm's shoulder-to-wrist circle.
 * An elbow coordinate is only a POLE HINT, never a rendered joint. The
 * two-bone solver below still owns exact bone lengths and wrist contact.
 * For opposite elbow hemispheres, prefer a downward/outboard sweep to
 * winding through the torso or passing through a straight-arm singularity.
 * Pure and time-sampled: no dependence on previous rendered frames.
 */
export function continuousElbowPole(shoulder:THREE.Vector3,
 wrist:THREE.Vector3,fromJoint:THREE.Vector3,toJoint:THREE.Vector3,
 side:-1|1,alpha:number):THREE.Vector3{
 const axis=wrist.clone().sub(shoulder).normalize();
 if(axis.lengthSq()<1e-8)axis.set(1,0,0);
 const flatten=(joint:THREE.Vector3)=>{
   const v=joint.clone().sub(shoulder);
   v.addScaledVector(axis,-v.dot(axis));
   if(v.lengthSq()<1e-8){
     v.set(0,-1,side);
     v.addScaledVector(axis,-v.dot(axis));
   }
   return v.normalize();
 };
 const from=flatten(fromJoint),to=flatten(toJoint);
 const cross=new THREE.Vector3().crossVectors(from,to);
 let angle=Math.atan2(axis.dot(cross),from.dot(to));
 const alternate=angle>=0?angle-2*Math.PI:angle+2*Math.PI;
 if(Math.abs(angle)>Math.PI*.75){
   const score=(a:number)=>{
     const mid=from.clone().applyAxisAngle(axis,a*.5);
     return -mid.y+side*mid.z*.8;
   };
   if(score(alternate)>score(angle)+.0001)angle=alternate;
 }
 return from.applyAxisAngle(axis,angle*Math.max(0,Math.min(1,alpha)));
}
