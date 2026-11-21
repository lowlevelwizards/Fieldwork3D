/** R1 opt-in proposal witness for the existing transient route writer APIs.
 * No observer is installed in production. Observational work happens only
 * after a route writer already decided to adopt; this is NOT a new gate.
 */
import type {Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {RouteSource} from './breach-route-transition.ts';
import {RECOVERY_SOURCE_POLICY,UNKNOWN_RECOVERY_EVIDENCE,
 shadowRecoveryDecision,type RecoveryRouteOperation,
 type RecoveryOwner,type RecoveryShadowRecord,type RecoveryProposal}
 from './breach-recovery-adoption-contract.ts';

let observer:((record:RecoveryShadowRecord)=>void)|null=null;
/** Call with null in finally during offline deterministic replay/audits. */
export function setRecoveryProposalObserver(
 next:((record:RecoveryShadowRecord)=>void)|null
):void{observer=next;}
export function hasRecoveryProposalObserver():boolean{return observer!==null;}

const copy=(p:Pt):Pt=>({x:p.x,y:p.y});
const ownerFor=(a:TeamActor,source:RouteSource):RecoveryOwner=>{
 if(source==='passage-retreat')return 'passage';
 if(a.traversal||a.traversalPending)return 'traversal';
 if(a.doorTraversal)return 'door';
 if(a.plan[0]?.kind==='move'&&a.plan[0].stackDoorId)return 'squad';
 return 'none';
};
/** Always preserve caller's ACTUAL route and motor state.
 * An optional diagnostics listener may never throw into gameplay.
 */
export function observeRecoveryProposal(
 s:Session,a:TeamActor,source:RouteSource,
 next:readonly Pt[],operation:RecoveryRouteOperation,
 actual:RecoveryShadowRecord['actual'],reason?:string
):void{
 const fn=observer;
 if(!fn)return;
 try{
  const order=a.plan[0];
  const proposal:RecoveryProposal={
   source,operation,policy:RECOVERY_SOURCE_POLICY[source],
   actorId:a.id,orderId:order?.id??null,
   orderKind:order?.kind??null,
   authoredGoal:order?.kind==='move'?copy(order.p):null,
   goalKey:a.routeGoalKey,from:copy(a.p),
   prior:a.nav.map(copy),next:next.map(copy),
   seconds:s.seconds,blockedSeconds:a.blockedTime,
   blocker:a.lastBlocker??null,
   owner:ownerFor(a,source),doorId:a.doorTraversal?.doorId??null,
   retryRouteAt:a.retryRouteAt,
   lastRepairAt:a.lastNavRepairAt,
   recoveryAttempts:a.recoveryAttempts,
   // A preexisting route writer adoption is NOT proof of clearance,
   // productive real motion, or cooldown eligibility. R2 selectors
   // will submit explicit evidence after validating on the live motor.
   evidence:{...UNKNOWN_RECOVERY_EVIDENCE}
  };
  const event=shadowRecoveryDecision(proposal,actual);
  if(reason&&actual==='rejection-witness')
   event.rejectionWitnessReason=reason;
  fn(event);
 }catch{
  // Neither a thrown listener nor diagnostics data can change movement.
 }
}
