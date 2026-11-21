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
import {finiteRecoveryPoint,finiteRecoveryRoute,recoveryDistance,
 makeRecoveryProposal,recordAdoptionWitness,readAdoptionWitness}
 from './breach-recovery-adoption-shared.ts';
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
/** R5: project the latest shared on-demand witness to the stable R2 API.
 * R2 and R4 no longer retain independent, potentially conflicting records.
 */
export function ordinaryRecoveryProgress(actor:TeamActor):null|{
 source:OrdinaryRecoverySource;status:'provisional'|'foot-progress'|'superseded';
 traveled:number;remaining:number;adoptedAt:number
}{
 const w=readAdoptionWitness(actor,'ordinary');
 if(!w)return null;
 return {source:w.source as OrdinaryRecoverySource,
  status:w.state==='moved'?'foot-progress':
   w.state==='superseded'?'superseded':'provisional',
  traveled:w.distance,remaining:w.remaining,adoptedAt:w.selectedAt};
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
  a.doorTraversal.waypoints.some(pt=>recoveryDistance(pt,a.nav[0])<3)&&
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
   finiteRecoveryPoint(goal)&&route.length>0&&finiteRecoveryRoute(route);
 // M2: a new route tail is NOT useful if its physically blocked first
 // waypoint is unchanged. The 3-unit tolerance matches the established
 // full-body first-stride route validation; the door/STACK special
 // recoveries are deliberately excluded from this generic rule.
 const staleFirstLeg=a.blockedTime>=1.25&&a.nav.length>0&&
   route.length>0&&recoveryDistance(route[0],a.nav[0])<3&&
   recoveryDistance(a.p,a.nav[0])>.5;
 const productive=c.useful&&materiallyDifferentRoute(a.nav,route)&&
   !staleFirstLeg;
 const evidence={
  eligibility:prepared?'pass' as const:'fail' as const,
  clearance:legalCertificate&&c.watchSafe?'pass' as const:'fail' as const,
  cooldown:retryReady?'pass' as const:'fail' as const,
  recurrence:'pass' as const,
  progress:productive?'pass' as const:'fail' as const
 };
 const proposal=makeRecoveryProposal(a,s,{
  source,operation:c.operation,
  policy:RECOVERY_SOURCE_POLICY[source],
  orderIdAtSelection:c.orderIdAtSelection,
  route,owner,evidence
 });
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
 if(accepted)
  recordAdoptionWitness(a,'ordinary',source,goal,s.seconds);
 return {accepted,decision,proof:{evidence:{
  ...evidence,recurrence:recurrenceOk?'pass':'fail'
 },owner}};
}
