/** R1: typed, PURE recovery proposal policy. It never moves bodies,
 * assigns navigation, changes authored orders, or grants collision clearance.
 * Physical/eligibility proofs are deliberately UNKNOWN until a selector
 * explicitly supplies real evidence in R2+. Do not infer clearance from
 * a route merely being adopted by the existing motor.
 */
import type {Pt} from './breach-core.ts';
import type {RouteSource} from './breach-route-transition.ts';

export type RecoveryFamily=
 'ordinary'|'cold'|'actor'|'door'|'stack'|'squeeze'|'escape'|
 'acquire'|'passage'|'entry'|'clear'|'diagnostic';
export type RecoveryIntent=
 'recovery'|'acquisition'|'sequencing'|'invalidation'|'diagnostic';
export type RecoveryClearance=
 'full-body'|'narrow-profile'|'door-managed'|'existing-route'|'none';
export type RecoveryProgress=
 'feet'|'threshold'|'hinge'|'waypoint'|'escape'|'none';
export type RecoveryRouteOperation='replace'|'prepend'|'observed-prepend';
export type RecoveryOwner='none'|'traversal'|'door'|'squad'|'passage';
export type RecoveryProof='pass'|'fail'|'unknown';
export type RecoveryEvidence={
 eligibility:RecoveryProof;clearance:RecoveryProof;cooldown:RecoveryProof;
 recurrence:RecoveryProof;progress:RecoveryProof;
};
/** Explicit strategy evidence passed to the R1 observer only after R2 gates it. */
export type RecoveryAdoptionProof={evidence:RecoveryEvidence;owner:RecoveryOwner};
export type RecoverySourcePolicy={
 family:RecoveryFamily;intent:RecoveryIntent;priority:0|1|2|3|4|5;
 clearance:RecoveryClearance;progress:RecoveryProgress;
};
/** Exhaustive source classification: adding a RouteSource requires R1 review.
 * Priority is advisory in R1. The actual motor's specialist owners prevail.
 */
const policy=(
 family:RecoveryFamily,intent:RecoveryIntent,
 priority:RecoverySourcePolicy['priority'],clearance:RecoveryClearance,
 progress:RecoveryProgress
):RecoverySourcePolicy=>({family,intent,priority,clearance,progress});
export const RECOVERY_SOURCE_POLICY:Readonly<Record<RouteSource,RecoverySourcePolicy>>={
 'initial-intel':policy('acquire','acquisition',0,'existing-route','feet'),
 'initial-enemy':policy('acquire','acquisition',0,'existing-route','feet'),
 'shove-stage':policy('acquire','acquisition',1,'door-managed','feet'),
 'fire-retreat':policy('acquire','sequencing',4,'full-body','feet'),
 'door-short-entry':policy('door','recovery',4,'full-body','threshold'),
 'door-rehearsal':policy('door','recovery',4,'door-managed','threshold'),
 'door-rehearsal-world':policy('door','recovery',4,'door-managed','threshold'),
 'door-rehearsal-joined-waypoint':policy('door','recovery',4,'door-managed','threshold'),
 'door-drift':policy('door','recovery',4,'full-body','feet'),
 'door-leaf-escape':policy('escape','recovery',5,'door-managed','escape'),
 'full-body-lane':policy('ordinary','recovery',1,'full-body','feet'),
 'blocked-leg-connector':policy('ordinary','recovery',1,'full-body','feet'),
 'collision-world-replan':policy('ordinary','recovery',1,'existing-route','feet'),
 'collision-intel-replan':policy('ordinary','recovery',0,'existing-route','feet'),
 'self-hinge-relief':policy('door','recovery',4,'full-body','hinge'),
 'local-detour':policy('actor','recovery',2,'full-body','feet'),
 'generated-entry-settle':policy('entry','sequencing',3,'door-managed','waypoint'),
 'initial-portal-recovery':policy('acquire','acquisition',1,'door-managed','threshold'),
 'passage-retreat':policy('passage','sequencing',5,'door-managed','threshold'),
 'door-handoff-reject':policy('diagnostic','diagnostic',0,'none','none'),
 'door-escape-swept-rejoin':policy('escape','recovery',5,'full-body','escape'),
 'door-escape-world-rejoin':policy('escape','recovery',5,'door-managed','escape'),
 'door-escape-local-portal':policy('escape','recovery',5,'door-managed','threshold'),
 'door-escape-future-portal':policy('door','recovery',4,'door-managed','threshold'),
 'door-squeeze-leaf-exit':policy('squeeze','recovery',4,'narrow-profile','escape'),
 'lane-cycle-world':policy('ordinary','recovery',2,'full-body','feet'),
 'stack-micro-corner':policy('stack','recovery',3,'full-body','waypoint'),
 'cold-micro-departure':policy('cold','recovery',2,'full-body','feet'),
 'motor-micro-departure':policy('cold','recovery',2,'full-body','feet'),
 'motor-cold-fine-world':policy('cold','recovery',2,'full-body','feet'),
 'motor-exact-passage':policy('cold','recovery',2,'full-body','feet'),
 'open-leaf-local-rejoin':policy('door','recovery',4,'full-body','threshold'),
 'd328-entry-fine-world':policy('stack','recovery',3,'full-body','waypoint'),
 'forced-door-shortcut':policy('door','recovery',4,'door-managed','feet'),
 'entry-squeeze-departure':policy('squeeze','recovery',4,'narrow-profile','waypoint')
};

export type RecoveryProposal={
 source:RouteSource;operation:RecoveryRouteOperation;
 policy:RecoverySourcePolicy;
 actorId:string;orderId:number|null;orderKind:string|null;
 authoredGoal:Pt|null;goalKey:string;from:Pt;
 prior:readonly Pt[];next:readonly Pt[];
 seconds:number;blockedSeconds:number;blocker:string|null;
 owner:RecoveryOwner;doorId:string|null;
 retryRouteAt:number;lastRepairAt:number;recoveryAttempts:number;
 evidence:RecoveryEvidence;
};
export type RecoveryVerdict=
 'exempt'|'would-adopt'|'would-defer'|'would-reject'|'requires-evidence';
export type RecoveryReason=
 'special-transition'|'empty-route'|'nonfinite-route'|'stale-order'|
 'ineligible'|'physical-blocked'|'protected-owner'|'cooling-down'|
 'route-recurrence'|'no-physical-progress'|'proof-missing'|'eligible';
export type RecoveryDecision={verdict:RecoveryVerdict;reason:RecoveryReason};
/** No implementation side effects. Real motor still makes every decision.
 * "unknown" evidence MUST never be treated as an affirmative clearance.
 */
export const UNKNOWN_RECOVERY_EVIDENCE:Readonly<RecoveryEvidence>=Object.freeze({
 eligibility:'unknown',clearance:'unknown',cooldown:'unknown',
 recurrence:'unknown',progress:'unknown'
});
const finite=(p:Pt)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
const ownerPriority:Record<RecoveryOwner,number>={
 none:0,squad:3,door:4,traversal:5,passage:5
};
export function evaluateRecoveryProposal(
 p:RecoveryProposal,currentOrderId:number|null=p.orderId
):RecoveryDecision{
 if(p.policy.intent!=='recovery'||(p.source==='door-leaf-escape'&&
    p.operation==='replace'&&!p.next.length))
  return {verdict:'exempt',reason:'special-transition'};
 if(!p.next.length)return {verdict:'would-reject',reason:'empty-route'};
 if(!finite(p.from)||!p.next.every(finite))
  return {verdict:'would-reject',reason:'nonfinite-route'};
 if(currentOrderId!==p.orderId)
  return {verdict:'would-reject',reason:'stale-order'};
 if(p.evidence.eligibility==='fail')
  return {verdict:'would-reject',reason:'ineligible'};
 if(p.evidence.clearance==='fail')
  return {verdict:'would-reject',reason:'physical-blocked'};
 if(ownerPriority[p.owner]>p.policy.priority)
  return {verdict:'would-defer',reason:'protected-owner'};
 if(p.evidence.cooldown==='fail')
  return {verdict:'would-defer',reason:'cooling-down'};
 if(p.evidence.recurrence==='fail')
  return {verdict:'would-defer',reason:'route-recurrence'};
 if(p.evidence.progress==='fail')
  return {verdict:'would-defer',reason:'no-physical-progress'};
 if(Object.values(p.evidence).some(v=>v==='unknown'))
  return {verdict:'requires-evidence',reason:'proof-missing'};
 return {verdict:'would-adopt',reason:'eligible'};
}
export type RecoveryShadowRecord={
 proposal:RecoveryProposal;decision:RecoveryDecision;
 actual:'adopted'|'observed-prepend'|'rejection-witness';
 rejectionWitnessReason?:string;
 /** Advisory discrepancy; never blocks the real motor. */
 differsFromActual:boolean;
};
export function shadowRecoveryDecision(
 proposal:RecoveryProposal,actual:RecoveryShadowRecord['actual']
):RecoveryShadowRecord{
 const decision=evaluateRecoveryProposal(proposal);
 return {proposal,decision,actual,
  differsFromActual:actual==='adopted'&&
   (decision.verdict==='would-defer'||decision.verdict==='would-reject')};
}
