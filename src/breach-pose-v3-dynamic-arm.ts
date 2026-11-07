/** V3 finite dynamic arm audition.
 * Uses the same 10+10 anatomy and fitted equipment as the static solver.
 * Only promotes VALID arm candidates; an unreachable contact or conflicting
 * equipment returns unresolved and leaves the existing presentation intact.
 * Candidate search is opt-in in the Lab; no live ballistic or motor writes.
 */
import * as THREE from 'three';
import {solveTwoBone,ARM_LIMITS,type LimbSolution} from './breach-ik.ts';
import {armorElbowPole} from './breach-arm-armor-clearance.ts';
import {evaluateArmConstraint,type PoseConstraintMode,
 type ArmConstraintReport} from './breach-pose-v3-constraints.ts';
import {LOW_READY_CONTACT_LIMITS,type PoseClearanceEnvelope} from './breach-pose-clearance-envelope.ts';

export interface DynamicArmRequest {
 shoulder:THREE.Vector3;
 wrist:THREE.Vector3;
 side:-1|1;
 mode:PoseConstraintMode;
 envelope:PoseClearanceEnvelope;
 preferredPole:THREE.Vector3;
 /** Non-deterministic continuity is permitted only as a weak preference. */
 referenceBend?:THREE.Vector3;
}
export type DynamicArmFit={
 status:'clear'|'unresolved';
 solution:LimbSolution|null;
 report:ArmConstraintReport;
 candidates:number;
 evaluations:number;
 softScale:number;
 reason:'valid'|'out-of-reach'|'no-clearance';
};
export const MAX_DYNAMIC_ARM_CANDIDATES=6;
export function solveV3DynamicArm(req:DynamicArmRequest):DynamicArmFit{
 const {shoulder,wrist,side,mode,envelope,referenceBend}=req;
 const poles=[
  req.preferredPole.clone(),
  new THREE.Vector3(3,-9,side*1.5),
  new THREE.Vector3(6,-8,side*2.0),
  ...([0,1,2] as const).map(v=>{
   const p=armorElbowPole(shoulder,side,v);
   return new THREE.Vector3(p.x,p.y,p.z);
  })
 ];
 // Generate each IK joint exactly once. Increase permissible SOFT contact
 // only through the established standard/compressed/deep budgets. A rigid
 // torso or plate never gets an increased penetration allowance.
 const candidates=poles.map(pole=>solveTwoBone(shoulder,wrist,10,10,
  pole,ARM_LIMITS,referenceBend));
 const budgets=mode==='aim'?[1,1.35]:
  [1,1.35,LOW_READY_CONTACT_LIMITS.maximumSoftScale];
 let evaluations=0,firstReport:ArmConstraintReport|null=null;
 for(const softScale of budgets){
  let best:LimbSolution|null=null,bestReport:ArmConstraintReport|null=null;
  for(const pose of candidates){
   evaluations++;
   const report=evaluateArmConstraint({shoulder,arm:pose,side,
     envelope,mode,referenceBend,softScale});
   if(!firstReport)firstReport=report;
   if(!report.valid)continue;
   if(!bestReport||report.quality<bestReport.quality-1e-6){
    best=pose;bestReport=report;
   }
  }
  // The first tier with a valid result wins; attractive but heavily
  // compressed poses cannot displace a standard low-contact solution.
  if(best&&bestReport)return {status:'clear',solution:best,
   report:bestReport,candidates:candidates.length,evaluations,
   softScale,reason:'valid'};
 }
 return {status:'unresolved',solution:null,report:firstReport!,
  candidates:candidates.length,evaluations,softScale:budgets.at(-1)!,
  reason:wrist.distanceTo(shoulder)>19.92?
   'out-of-reach':'no-clearance'};
}
