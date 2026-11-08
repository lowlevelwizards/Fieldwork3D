/** V3 finite dynamic arm audition.
 * Uses the same 10+10 anatomy and fitted equipment as the static solver.
 * Only promotes VALID arm candidates; an unreachable contact or conflicting
 * equipment returns unresolved and leaves the existing presentation intact.
 * Candidate search is opt-in in the Lab; no live ballistic or motor writes.
 */
import * as THREE from 'three';
import {solveTwoBone,ARM_LIMITS,type LimbSolution} from './breach-ik.ts';
import {armorElbowPole} from './breach-arm-armor-clearance.ts';
import {anatomicalElbowCost} from './breach-anatomy.ts';
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
 /** Live-only candidate hysteresis. Never sample frame history in replay. */
 continuityBias?:number;
 /** For an underarm short-stock firing hand, the elbow stays outside
  * the right receiver/stock rather than crossing behind it. */
 outboardFiring?:boolean;
 /** B24b V4 preview only; normal V3 and gameplay remain strict. */
 allowReloadOverlap?:boolean;
 allowVisualOverlap?:boolean;
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
/** Six authored directions, then six geometric ring probes only when needed.
 * Never do an exhaustive 24-angle search on every operator frame. */
export const MAX_DYNAMIC_ARM_CANDIDATES=12;
const MINIMAL_CANDIDATES=6;
// Candidate thresholds are constants, not fresh arrays in each arm solve.
const AIM_SOFT_BUDGETS=Object.freeze([1,1.35] as const);
const FLEX_SOFT_BUDGETS=Object.freeze(
 [1,1.35,LOW_READY_CONTACT_LIMITS.maximumSoftScale] as const);
function ringPoles(shoulder:THREE.Vector3,wrist:THREE.Vector3){
 const axis=wrist.clone().sub(shoulder).normalize();
 const ref=new THREE.Vector3(0,-1,0);
 ref.addScaledVector(axis,-ref.dot(axis));
 if(ref.lengthSq()<1e-6)
  ref.set(0,0,1).addScaledVector(axis,-axis.z);
 ref.normalize();
 const across=new THREE.Vector3().crossVectors(axis,ref).normalize();
 const result:THREE.Vector3[]=[];
 for(let i=0;i<6;i++){
  const a=2*Math.PI*(i+.5)/6;
  result.push(ref.clone().multiplyScalar(Math.cos(a))
   .addScaledVector(across,Math.sin(a)));
 }
 return result;
}
export function solveV3DynamicArm(req:DynamicArmRequest):DynamicArmFit{
 const {shoulder,wrist,side,mode,envelope,referenceBend}=req;
 // Unreachable wrists are common at doors and during contact hand-offs.
 // Report the same single candidate, but do not build six elbow poles,
 // geometrical offsets and soft-budget arrays first.
 if(wrist.distanceTo(shoulder)>19.92){
  const pose=solveTwoBone(shoulder,wrist,10,10,req.preferredPole,ARM_LIMITS);
  const report=evaluateArmConstraint({shoulder,arm:pose,side,
   envelope,mode,softScale:1,
   allowReloadOverlap:req.allowReloadOverlap,
   allowVisualOverlap:req.allowVisualOverlap});
  return {status:'unresolved',solution:null,report,
   candidates:1,evaluations:1,softScale:1,reason:'out-of-reach'};
 }
 const firingTuck=side===1&&(mode==='carry'||mode==='aim');
 const seedPoles=[
  ...(referenceBend&&req.continuityBias?
    [referenceBend.clone()]:[]),
  req.preferredPole.clone(),
  firingTuck?new THREE.Vector3(3,-10.5,.45):
   new THREE.Vector3(3,-9,side*1.5),
  firingTuck?new THREE.Vector3(5.5,-9,.85):
   new THREE.Vector3(6,-8,side*2.0),
  ...([0,1,2] as const).map(v=>{
   const p=armorElbowPole(shoulder,side,v);
   return new THREE.Vector3(p.x,p.y,p.z);
  })
 ];
 const budgets=mode==='aim'?AIM_SOFT_BUDGETS:FLEX_SOFT_BUDGETS;
 let evaluations=0,firstReport:ArmConstraintReport|null=null;
 let bestInvalid:ArmConstraintReport|null=null,lowestFailure=Infinity;
 const evaluate=(poles:readonly THREE.Vector3[],baseCount:number):
  DynamicArmFit|null=>{
  const poses=poles.map(pole=>solveTwoBone(shoulder,wrist,10,10,
   pole,ARM_LIMITS,referenceBend));
  // Hard torso and insert intersections cannot be cured by expanding
  // SOFT fabric allowances. Evaluate each permanently blocked candidate
  // only once instead of repeating an expensive 15-axis OBB pass at the
  // moderate and deep compression tiers.
  const permanentlyBlocked=new Set<LimbSolution>();
  for(const softScale of budgets){
   let best:LimbSolution|null=null,bestReport:ArmConstraintReport|null=null;
  let bestScore=Infinity;
   for(const pose of poses){
    if(permanentlyBlocked.has(pose))continue;
    evaluations++;
    const report=evaluateArmConstraint({shoulder,arm:pose,side,
      envelope,mode,referenceBend,softScale,
      allowReloadOverlap:req.allowReloadOverlap,
      allowVisualOverlap:req.allowVisualOverlap});
    if(!firstReport)firstReport=report;
    const visual=req.allowVisualOverlap&&
      (mode==='carry'||mode==='aim');
    const hardCutoff=req.allowReloadOverlap&&mode==='reload'?2.65:
      visual?(side===1?2.30:1.90):LOW_READY_CONTACT_LIMITS.rigid;
    if(report.hardDepth>hardCutoff+.001||
       !pose.reached)permanentlyBlocked.add(pose);
    if(!report.valid){
     const penalty=(pose.reached?0:12)+
      (report.contactValid?0:4)+report.hardDepth*2+
      report.softDepth*.4+report.quality*.1;
     if(penalty<lowestFailure){
      lowestFailure=penalty;bestInvalid=report;
     }
     continue;
    }
    const difference=referenceBend?
      Math.max(0,1-pose.bendPlane.dot(referenceBend)):0;
    // Outboard short-stock is a preferred VALID silhouette, never a
    // license to penetrate the plate or extend an arm. Penalize solutions
    // that fold the right elbow behind the firing hand/receiver.
    const outboardCost=req.outboardFiring&&side===1?
      anatomicalElbowCost(shoulder,pose.joint,pose.effector,side,true)-
      anatomicalElbowCost(shoulder,pose.joint,pose.effector,side):0;
    const weightedQuality=report.quality+
      difference*(req.continuityBias??0)+outboardCost;
    if(weightedQuality<bestScore-1e-6){
     best=pose;bestReport=report;bestScore=weightedQuality;
    }
   }
   if(best&&bestReport)return {status:'clear',solution:best,
    report:bestReport,candidates:baseCount,evaluations,softScale,
    reason:'valid'};
  }
  return null;
 };
 const found=evaluate(seedPoles,MINIMAL_CANDIDATES);
 if(found)return found;
 // Unusual armor and action targets may need an elbow bend plane that is
 // not in our six preferred poses; audit a small deterministic ring only
 // after the primary candidate set demonstrably fails.
 const ring=evaluate(ringPoles(shoulder,wrist),MAX_DYNAMIC_ARM_CANDIDATES);
 if(ring)return ring;
 return {status:'unresolved',solution:null,
  report:bestInvalid??firstReport!,
  candidates:MAX_DYNAMIC_ARM_CANDIDATES,evaluations,
  softScale:budgets.at(-1)!,reason:'no-clearance'};
}
