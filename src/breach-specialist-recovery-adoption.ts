/** R3: shared *specialist* recovery proposal/adoption contract.
 * This only authorizes replacement of disposable motor navigation after the
 * EXISTING door/STACK/squeeze/escape selector has furnished real evidence.
 * It grants no footstep, threshold crossing, door movement or plan mutation.
 */
import type {Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {RouteSource} from './breach-route-transition.ts';
import {evaluateRecoveryProposal,RECOVERY_SOURCE_POLICY,
 type RecoveryAdoptionProof,type RecoveryDecision,type RecoveryOwner,
 type RecoveryClearance,type RecoverySourcePolicy}
 from './breach-recovery-adoption-contract.ts';

export type SpecialistOwner=
 'door-episode'|'door-contact'|'generated-stack'|
 'narrow-exit'|'physical-escape'|'portal-handoff';
export type SpecialistCertificate=
 'swept-full-body'|'verified-world-join'|'door-managed-prefix'|
 'oriented-squeeze'|'post-physical-escape';
export type SpecialistRecoverySource=Extract<RouteSource,
 'door-short-entry'|'door-rehearsal'|'door-rehearsal-world'|
 'door-rehearsal-joined-waypoint'|'door-drift'|
 'd328-entry-fine-world'|'lane-cycle-world'|'stack-micro-corner'|
 'self-hinge-relief'|'open-leaf-local-rejoin'|
 'entry-squeeze-departure'|'door-squeeze-leaf-exit'|
 'door-leaf-escape'|'door-escape-swept-rejoin'|
 'door-escape-world-rejoin'|'door-escape-local-portal'|
 'door-escape-future-portal'>;
export type SpecialistRecoveryCandidate={
 actor:TeamActor;session:Session;source:SpecialistRecoverySource;
 operation:'replace'|'prepend';route:readonly Pt[];goal:Pt;
 orderIdAtSelection:number|null;owner:SpecialistOwner;
 certificate:SpecialistCertificate;
 /** Only selectors with actual real geometry/episode proof may claim true. */
 eligible:boolean;
 clearanceVerified:boolean;cooldownClaimed:boolean;
 recurrenceClaimed:boolean;useful:boolean;
 /** An empty route is legal ONLY after the physical escape body moved. */
 escapedBody?:boolean;
};
export type SpecialistRecoveryResult={
 accepted:boolean;decision:RecoveryDecision;
 proof:RecoveryAdoptionProof;
};

const compatible:Readonly<Record<SpecialistRecoverySource,
 readonly SpecialistOwner[]>>={
 'door-short-entry':['door-episode'],
 'door-rehearsal':['door-episode'],
 'door-rehearsal-world':['door-episode'],
 'door-rehearsal-joined-waypoint':['door-episode'],
 'door-drift':['door-episode'],
 'd328-entry-fine-world':['generated-stack'],
 'lane-cycle-world':['generated-stack','door-episode'],
 'stack-micro-corner':['generated-stack'],
 'self-hinge-relief':['door-contact'],
 'open-leaf-local-rejoin':['door-contact'],
 'entry-squeeze-departure':['narrow-exit'],
 'door-squeeze-leaf-exit':['narrow-exit'],
 'door-leaf-escape':['physical-escape'],
 'door-escape-swept-rejoin':['physical-escape'],
 'door-escape-world-rejoin':['portal-handoff'],
 'door-escape-local-portal':['portal-handoff'],
 'door-escape-future-portal':['portal-handoff']
};
const certificates:Readonly<Record<SpecialistOwner,
 readonly SpecialistCertificate[]>>={
 'door-episode':['swept-full-body','verified-world-join'],
 'door-contact':['swept-full-body','verified-world-join'],
 'generated-stack':['swept-full-body','verified-world-join'],
 'narrow-exit':['oriented-squeeze'],
 'physical-escape':['post-physical-escape','swept-full-body'],
 'portal-handoff':['verified-world-join','door-managed-prefix',
  'oriented-squeeze']
};
const finite=(p:Pt)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
const ownerName:Record<SpecialistOwner,RecoveryOwner>={
 'door-episode':'door','door-contact':'door',
 'generated-stack':'squad','narrow-exit':'door',
 'physical-escape':'door','portal-handoff':'door'
};
/** R1 source 'lane-cycle-world' is shared by door and STACK selectors.
 * Its source-wide priority cannot encode which writer owns the route.
 * Pass the actual owner/clearance profile through the existing optional
 * observer without silently treating a STACK waypoint as ordinary A*.
 */
function contextPolicy(
 source:SpecialistRecoverySource,owner:SpecialistOwner,
 certificate:SpecialistCertificate
):RecoverySourcePolicy{
 const base=RECOVERY_SOURCE_POLICY[source];
 const clearance:RecoveryClearance=certificate==='oriented-squeeze'?
  'narrow-profile':certificate==='door-managed-prefix'?
  'door-managed':certificate==='verified-world-join'?
  'existing-route':certificate==='post-physical-escape'?
  'none':'full-body';
 const priority:RecoverySourcePolicy['priority']=
  owner==='physical-escape'?5:
  owner==='door-episode'||owner==='door-contact'||
  owner==='narrow-exit'||owner==='portal-handoff'?4:3;
 return {...base,priority,clearance,
  family:owner==='generated-stack'?'stack':
   owner==='narrow-exit'?'squeeze':
   owner==='physical-escape'?'escape':'door'};
}
/** R3 is an enforcing preflight. Caller MUST invoke before committing
 * episode counters, actor-owned route markers or transient navigation.
 * This does not replace the specialist selector or retry ledger.
 */
export function evaluateSpecialistRecoveryAdoption(
 c:SpecialistRecoveryCandidate
):SpecialistRecoveryResult{
 const {actor:a,session:s,source,owner,goal,route}=c;
 const order=a.plan[0],currentOrderId=order?.id??null;
 const rightOwner=compatible[source].includes(owner);
 const validCertificate=certificates[owner].includes(c.certificate);
 const generatedOwner=owner==='generated-stack';
 const narrowOwner=owner==='narrow-exit';
 const episodeOwner=owner==='door-episode';
 const deliberateEscape=owner==='physical-escape'&&
  c.certificate==='post-physical-escape'&&
  c.escapedBody===true;
 const contextEligible=c.eligible&&rightOwner&&validCertificate&&
  finite(goal)&&finite(a.p)&&
  (deliberateEscape||!!order&&order.kind==='move')&&
  (!generatedOwner||order?.kind==='move'&&!!order.stackDoorId)&&
  (!narrowOwner||a.squeeze)&&
  (!episodeOwner||!!a.doorTraversal)&&
  (!deliberateEscape||source==='door-leaf-escape');
 const isEmpty=route.length===0;
 // The only intentional empty route invalidates navigation *after* real
 // leaf-overlap escape. No invented virtual waypoint or GO completion.
 const acceptsEmpty=isEmpty&&deliberateEscape&&
  source==='door-leaf-escape'&&c.operation==='replace';
 const preflight=route.every(finite)&&
  (route.length>0||acceptsEmpty);
 const precedenceOwner=ownerName[owner];
 const policy=contextPolicy(source,owner,c.certificate);
 const proof:RecoveryAdoptionProof={
  owner:precedenceOwner,policyOverride:policy,
  evidence:{
   eligibility:contextEligible?'pass':'fail',
   clearance:c.clearanceVerified&&preflight?'pass':'fail',
   cooldown:c.cooldownClaimed?'pass':'fail',
   recurrence:c.recurrenceClaimed?'pass':'fail',
   // This means the candidate is useful / distinct, NOT that physical
   // movement happened. Footsteps are the sole success authority.
   progress:c.useful?'pass':'fail'
  }
 };
 const proposal={
  source,operation:c.operation,policy,
  actorId:a.id,orderId:c.orderIdAtSelection,
  orderKind:order?.kind??null,
  authoredGoal:order?.kind==='move'?order.p:null,
  goalKey:a.routeGoalKey,from:a.p,prior:a.nav,next:route,
  seconds:s.seconds,blockedSeconds:a.blockedTime,
  blocker:a.lastBlocker??null,owner:precedenceOwner,
  doorId:a.doorTraversal?.doorId??null,
  retryRouteAt:a.retryRouteAt,
  lastRepairAt:a.lastNavRepairAt,
  recoveryAttempts:a.recoveryAttempts,
  evidence:proof.evidence
 };
 // R1 deliberately exempts post-escape nav invalidation; *R3* demands
 // witnessed physical escape and matching source/certificate before it.
 let decision=evaluateRecoveryProposal(proposal,currentOrderId);
 if(decision.verdict==='exempt'&&(!contextEligible||!preflight||
    c.orderIdAtSelection!==currentOrderId))
  decision={verdict:'would-reject',reason:!contextEligible?'ineligible':
   !preflight?'empty-route':'stale-order'};
 return {accepted:(decision.verdict==='would-adopt'||
  decision.verdict==='exempt')&&preflight&&contextEligible,
  decision,proof};
}
