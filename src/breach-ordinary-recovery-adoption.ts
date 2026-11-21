/** R2 — one adoption decision for ordinary collision route RECOVERY.
 * A strategy still owns route generation and its real full-body/known-world
 * clearance proof. This module never moves an actor, opens a door, changes
 * an authored order, touches the world/knowledge model, or calls A*.
 *
 * IMPORTANT: a trusted world/intel planner result is NOT a full-body sweep.
 * Physical movement remains under resolveMotorCollision every 60 Hz step.
 */
import type {Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {allowPhysicalRouteReissue} from './breach-route-recurrence.ts';
import {materiallyDifferentRoute} from './breach-movement-recovery.ts';
import {evaluateRecoveryProposal,RECOVERY_SOURCE_POLICY,
 type RecoveryAdoptionProof,type RecoveryDecision,type RecoveryOwner}
 from './breach-recovery-adoption-contract.ts';

export type OrdinaryRecoverySource=
 'full-body-lane'|'blocked-leg-connector'|
 'collision-world-replan'|'collision-intel-replan'|'local-detour';
export type OrdinaryPhysicalCertificate=
 'first-full-body-stride'|'swept-local-detour'|
 'world-route-selected'|'known-intel-route-selected';
export type OrdinaryRetryClaim=
 'normal-lane-window'|'hysteretic-detour'|'cold-frame-detour'|'collision-retry';
export type OrdinaryRecurrenceFamily=
 'full-body-lane'|'blocked-leg-connector'|'collision-replan'|
 'frame-actor-detour'|'none';
export type OrdinaryRecoveryCandidate={
 actor:TeamActor;session:Session;source:OrdinaryRecoverySource;
 operation:'replace'|'prepend';
 goal:Pt;route:readonly Pt[];orderIdAtSelection:number|null;
 /** Caller has passed its existing physical and authorship eligibility. */
 eligible:boolean;
 /** A REAL sweep or legitimate route producer; never infer from adoption. */
 certificate:OrdinaryPhysicalCertificate;
 /** A verified WATCH/facing-safe first leg. */
 watchSafe:boolean;
 /** A different usable first leg or meaningful alternative, not a tail churn. */
 useful:boolean;
 /** Existing caller-specific time/budget claim; we check the class again. */
 retry:OrdinaryRetryClaim;
 /** Retain each historic recurrence family, including M2 shared ordinary. */
 recurrence:OrdinaryRecurrenceFamily;
};
export type OrdinaryRecoveryResult={
 accepted:boolean;decision:RecoveryDecision;
 proof:RecoveryAdoptionProof;
};

const certificates:Readonly<Record<OrdinaryRecoverySource,OrdinaryPhysicalCertificate>>={
 'full-body-lane':'first-full-body-stride',
 'blocked-leg-connector':'first-full-body-stride',
 'local-detour':'swept-local-detour',
 'collision-world-replan':'world-route-selected',
 'collision-intel-replan':'known-intel-route-selected'
};
const finite=(p:Pt)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
const gap=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const last=new WeakMap<TeamActor,{
 source:OrdinaryRecoverySource;orderId:number|null;
 from:Pt;goal:Pt;first:Pt;adoptedAt:number
}>();
/** Snapshot evaluated only on request, not on every motor tick. Acceptance
 * never claims successful travel; only real later feet can confirm it. */
export function ordinaryRecoveryProgress(actor:TeamActor):null|{
 source:OrdinaryRecoverySource;status:'provisional'|'foot-progress'|'superseded';
 traveled:number;remaining:number;adoptedAt:number
}{
 const prior=last.get(actor);if(!prior)return null;
 const order=actor.plan[0]?.id??null;
 const traveled=gap(actor.p,prior.from);
 return {source:prior.source,
  status:order!==prior.orderId?'superseded':
   traveled>=.3?'foot-progress':'provisional',
  traveled,remaining:gap(actor.p,prior.goal),adoptedAt:prior.adoptedAt};
}
/** New R2 adoption authority: all ordinary selectors must pass this gate
 * AFTER their existing exact geometry/route/target checks, BEFORE writing
 * transient nav. Non-ordinary door, ENTRY/STACK, squeeze, and escape
 * strategies continue through the existing specialized authorities.
 */
export function evaluateOrdinaryRecoveryAdoption(
 c:OrdinaryRecoveryCandidate
):OrdinaryRecoveryResult{
 const {actor:a,session:s,source,goal,route}=c;
 const currentOrder=a.plan[0]?.id??null;
 // A currently reserved physical crossing or active outside-leaf route
 // is not an ordinary collision detour. The original caller retains
 // first right of refusal; this is a conservative backstop.
 const ownsOutsideLeaf=!!a.doorTraversal&&
  a.doorTraversal.maneuver==='outside-leaf'&&
  a.doorTraversal.waypoints.length>0&&
  a.nav.length>0&&
  a.doorTraversal.waypoints.some(pt=>gap(pt,a.nav[0])<3)&&
  s.seconds-a.doorTraversal.lastProgressAt<1.8;
 const owner:RecoveryOwner=a.traversal||a.traversalPending?'traversal':
  ownsOutsideLeaf?'door':'none';
 // Generated STACK may legitimately use a full-body lane to its
 // CURRENT authored stack waypoint. It must never skip/replace a plan.
 const signature=c.operation==='replace'?
  source!=='local-detour':source==='local-detour';
 const legalCertificate=c.certificate===certificates[source];
 const retryReady=c.retry==='collision-retry'?
  s.seconds>=a.retryRouteAt:
  c.retry==='normal-lane-window'?
   s.seconds-a.lastNormalLaneProbeAt<=.08:
   c.retry==='hysteretic-detour'?
    s.seconds-a.lastNavRepairAt>=.65:
    c.retry==='cold-frame-detour'?
     s.seconds-a.lastNavRepairAt<=.08:false;
 const prepared=c.eligible&&signature&&
   finite(goal)&&route.length>0&&route.every(finite);
 // M2: a new route tail is NOT useful if its physically blocked first
 // waypoint is unchanged. The 3-unit tolerance matches the established
 // full-body first-stride route validation; the door/STACK special
 // recoveries are deliberately excluded from this generic rule.
 const staleFirstLeg=a.blockedTime>=1.25&&a.nav.length>0&&
   route.length>0&&gap(route[0],a.nav[0])<3&&
   gap(a.p,a.nav[0])>.5;
 const productive=c.useful&&materiallyDifferentRoute(a.nav,route)&&
   !staleFirstLeg;
 const evidence={
  eligibility:prepared?'pass' as const:'fail' as const,
  clearance:legalCertificate&&c.watchSafe?'pass' as const:'fail' as const,
  cooldown:retryReady?'pass' as const:'fail' as const,
  recurrence:'pass' as const,
  progress:productive?'pass' as const:'fail' as const
 };
 const proposal={
  source,operation:c.operation,policy:RECOVERY_SOURCE_POLICY[source],
  actorId:a.id,orderId:c.orderIdAtSelection,
  orderKind:a.plan[0]?.kind??null,
  authoredGoal:a.plan[0]?.kind==='move'?a.plan[0].p:null,
  goalKey:a.routeGoalKey,from:a.p,prior:a.nav,next:route,
  seconds:s.seconds,blockedSeconds:a.blockedTime,
  blocker:a.lastBlocker??null,owner,
  doorId:a.doorTraversal?.doorId??null,
  retryRouteAt:a.retryRouteAt,lastRepairAt:a.lastNavRepairAt,
  recoveryAttempts:a.recoveryAttempts,evidence
 };
 let decision=evaluateRecoveryProposal(proposal,currentOrder);
 let recurrenceOk=true;
 if(decision.verdict==='would-adopt'&&c.recurrence!=='none'){
  recurrenceOk=allowPhysicalRouteReissue(
   a,c.recurrence,goal,route,s.seconds);
  if(!recurrenceOk)
   decision=evaluateRecoveryProposal({
    ...proposal,evidence:{...evidence,recurrence:'fail'}
   },currentOrder);
 }
 const accepted=decision.verdict==='would-adopt'&&recurrenceOk;
 if(accepted){
  last.set(a,{source,orderId:currentOrder,from:{...a.p},
   goal:{...goal},first:{...route[0]},adoptedAt:s.seconds});
 }
 return {accepted,decision,proof:{evidence:{
  ...evidence,recurrence:recurrenceOk?'pass':'fail'
 },owner}};
}
