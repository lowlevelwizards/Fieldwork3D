/** R4: exceptional route acquisition and refresh, NOT obstruction recovery.
 * The existing normal motor still owns actual footsteps, collisions, doors,
 * retries, intel visibility and authored orders. Caller proves provenance.
 * An empty initial query is an expected NEGATIVE result, not adopted motion.
 */
import type {Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {RECOVERY_SOURCE_POLICY,
 type RecoveryAdoptionProof,type RecoveryOwner,type RecoverySourcePolicy}
 from './breach-recovery-adoption-contract.ts';

export type AcquisitionSource=
 'initial-intel'|'initial-enemy'|'fire-retreat'|
 'shove-stage'|'initial-portal-recovery'|'forced-door-shortcut'|
 'motor-cold-fine-world';
export type AcquisitionCertificate=
 'known-intel-query'|'enemy-cached-query'|'swept-fire-lane'|
 'known-shove-crossing'|'first-operable-door-prefix'|
 'broken-latch-world-shortcut'|'cold-fine-full-body';
export type AcquisitionResultKind='adopt'|'no-route'|'reject';
export type AcquisitionRejection=
 'none'|'no-route'|'wrong-source-certificate'|'wrong-actor'|
 'not-authorized'|'stale-order'|'protected-owner'|
 'nonfinite-route'|'empty-route'|'not-authored-goal'|
 'wrong-route-shape'|'not-physically-cleared';
export type AcquisitionCandidate={
 actor:TeamActor;session:Session;source:AcquisitionSource;
 goal:Pt;route:readonly Pt[];
 orderIdAtSelection:number|null;certificate:AcquisitionCertificate;
 /** Caller has already checked the original strategy's physical trigger. */
 eligible:boolean;
 /** First stride was real swept, where required by the specific selector. */
 physicalProof:boolean;
 /** True only when the caller genuinely required an initial route. */
 initialRouteAbsent:boolean;
};
export type AcquisitionDecision={
 kind:AcquisitionResultKind;reason:AcquisitionRejection;
 proof:RecoveryAdoptionProof|null;
};
const SOURCE_CERT:Readonly<Record<AcquisitionSource,AcquisitionCertificate>>={
 'initial-intel':'known-intel-query',
 'initial-enemy':'enemy-cached-query',
 'fire-retreat':'swept-fire-lane',
 'shove-stage':'known-shove-crossing',
 'initial-portal-recovery':'first-operable-door-prefix',
 'forced-door-shortcut':'broken-latch-world-shortcut',
 'motor-cold-fine-world':'cold-fine-full-body'
};
const finite=(p:Pt):boolean=>Number.isFinite(p.x)&&Number.isFinite(p.y);
const near=(a:Pt,b:Pt,tol=.5):boolean=>Math.hypot(a.x-b.x,a.y-b.y)<=tol;
const whole=(source:AcquisitionSource):boolean=>
 source==='initial-intel'||source==='initial-enemy';
const owner=(source:AcquisitionSource):RecoveryOwner=>
 source==='initial-portal-recovery'||source==='forced-door-shortcut'?
 'door':'none';
const clearance:Record<AcquisitionSource,RecoverySourcePolicy['clearance']>={
 'initial-intel':'existing-route','initial-enemy':'existing-route',
 'fire-retreat':'full-body','shove-stage':'door-managed',
 'initial-portal-recovery':'door-managed',
 'forced-door-shortcut':'existing-route',
 'motor-cold-fine-world':'full-body'
};
const witness=new WeakMap<TeamActor,{
 source:AcquisitionSource;orderId:number|null;at:Pt;
 goal:Pt;selectedAt:number;negative:boolean
}>();
/** No route/actor mutation. In R4, 'no-route' must still be recorded as
 * a legitimate failed normal query so shove/portal/backoff can execute.
 * It must NEVER be reported as success or physical progress.
 */
export function evaluateRouteAcquisition(c:AcquisitionCandidate):AcquisitionDecision{
 const {actor:a,session:s,source,route,goal}=c;
 const reject=(reason:AcquisitionRejection):AcquisitionDecision=>({
  kind:'reject',reason,proof:null
 });
 if(c.certificate!==SOURCE_CERT[source])
  return reject('wrong-source-certificate');
 if(!c.eligible)return reject('not-authorized');
 const order=a.plan[0],orderId=order?.id??null;
 if(orderId!==c.orderIdAtSelection)return reject('stale-order');
 if(!finite(a.p)||!finite(goal)||!route.every(finite))
  return reject('nonfinite-route');
 const blue=a.side==='blue';
 if(source==='initial-enemy'&&blue||
    source!=='initial-enemy'&&source!=='fire-retreat'&&!blue)
  return reject('wrong-actor');
 const needsMove=source==='forced-door-shortcut'||
   source==='shove-stage'||source==='initial-portal-recovery'||
   source==='motor-cold-fine-world'||source==='initial-intel';
 if(needsMove&&(order?.kind!=='move'||!near(order.p,goal)))
  return reject('not-authored-goal');
 const initial=source==='initial-intel'||source==='initial-enemy';
 if(initial!==c.initialRouteAbsent&&
    (initial||source!=='forced-door-shortcut'))
  return reject('wrong-route-shape');
 if(!initial&&source!=='forced-door-shortcut'&&a.nav.length>0)
  return reject('protected-owner');
 if(source==='forced-door-shortcut'&&
   (!a.nav.length||a.doorTraversal||a.traversal||a.traversalPending||
   a.squeeze||a.autoSidestep||a.fireRetreatTarget))
  return reject('protected-owner');
 if(source==='initial-portal-recovery'&&
   (a.doorTraversal||a.traversalPending))
  return reject('protected-owner');
 if(source==='motor-cold-fine-world'&&
   (a.doorTraversal||a.traversal||a.traversalPending||a.squeeze||
    a.fireRetreatTarget||!!order?.entryDoorId||!!order?.stackDoorId))
  return reject('protected-owner');
 if(source==='fire-retreat'&&
   (!a.fireRetreatTarget||!near(goal,a.fireRetreatTarget)))
  return reject('not-authorized');
 if(!route.length&&!initial)return reject('empty-route');
 // Do not demand a remote GO at the end of an intermediate portal or
 // shove stage. Shove-stage retains its authored GO after its short prefix.
 if(source==='shove-stage'&&!near(route[route.length-1],goal))
  return reject('wrong-route-shape');
 if(source==='motor-cold-fine-world'&&
    !near(route[route.length-1],goal))
  return reject('wrong-route-shape');
 // Full-body fire retreats and cold fine routes have real physical
 // selector sweeps; an ordinary grid/intel query is NOT that proof.
 if((source==='fire-retreat'||source==='motor-cold-fine-world'||
     source==='forced-door-shortcut')&&!c.physicalProof)
  return reject('not-physically-cleared');
 const isNegative=initial&&!route.length;
 const policy:RecoverySourcePolicy={
  ...RECOVERY_SOURCE_POLICY[source],intent:'acquisition',
  family:'acquire',clearance:clearance[source],
  priority:source==='fire-retreat'?4:
   source==='forced-door-shortcut'?4:
   source==='initial-portal-recovery'?1:0
 };
 const proof:RecoveryAdoptionProof={
  owner:owner(source),policyOverride:policy,
  evidence:{
   eligibility:isNegative?'fail':'pass',
   clearance:isNegative?'unknown':c.physicalProof?'pass':'unknown',
   cooldown:'pass',recurrence:'pass',
   progress:isNegative?'fail':'unknown'
  }
 };
 return {kind:isNegative?'no-route':'adopt',
  reason:isNegative?'no-route':'none',proof};
}
/** The accepted initial no-route result deliberately preserves the
 * existing setTransientRoute([], source) transition, then normal fallbacks.
 * Never treat route acquisition as arrival or reset blockedTime/attempts.
 */
export function authorizeRouteAcquisition(c:AcquisitionCandidate):
 AcquisitionDecision{
 const decision=evaluateRouteAcquisition(c);
 if(decision.kind!=='reject'){
  witness.set(c.actor,{
   source:c.source,orderId:c.orderIdAtSelection,
   at:{...c.actor.p},goal:{...c.goal},
   selectedAt:c.session.seconds,negative:decision.kind==='no-route'
  });
 }
 return decision;
}
export function acquisitionProgress(a:TeamActor):null|{
 source:AcquisitionSource;state:'no-route'|'provisional'|'moved'|'superseded';
 distance:number;selectedAt:number
}{
 const prior=witness.get(a);
 if(!prior)return null;
 const moved=Math.hypot(a.p.x-prior.at.x,a.p.y-prior.at.y);
 const state=a.plan[0]?.id!==prior.orderId?'superseded':
  prior.negative?'no-route':moved>=.3?'moved':'provisional';
 return {source:prior.source,state,distance:moved,selectedAt:prior.selectedAt};
}
