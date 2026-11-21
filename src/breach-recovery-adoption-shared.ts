/** R5: one shared, side-effect-free recovery proposal envelope and one
 * actor-scoped, on-demand adoption witness across R2 ordinary and R4
 * acquisition. Neither component is a motor, retry ledger or physics proof.
 */
import type {Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {RouteSource} from './breach-route-transition.ts';
import type {RecoveryEvidence,RecoveryOwner,
 RecoveryProposal,RecoveryRouteOperation,RecoverySourcePolicy}
 from './breach-recovery-adoption-contract.ts';

export const finiteRecoveryPoint=(p:Pt):boolean=>
 Number.isFinite(p.x)&&Number.isFinite(p.y);
export const finiteRecoveryRoute=(route:readonly Pt[]):boolean=>
 route.every(finiteRecoveryPoint);
export const recoveryDistance=(a:Pt,b:Pt):number=>
 Math.hypot(a.x-b.x,a.y-b.y);

/** R2 and R3 enforce exactly the same live actor/order/source envelope.
 * This intentionally retains LIVE point references until the evaluator
 * returns; copying route data is only required for the optional R1 shadow
 * forensic observer, not for a synchronous preflight.
 */
export function makeRecoveryProposal(
 actor:TeamActor,session:Session,opts:{
  source:RouteSource;operation:RecoveryRouteOperation;
  orderIdAtSelection:number|null;route:readonly Pt[];
  policy:RecoverySourcePolicy;owner:RecoveryOwner;
  evidence:RecoveryEvidence
 }
):RecoveryProposal{
 const order=actor.plan[0];
 return {
  source:opts.source,operation:opts.operation,policy:opts.policy,
  actorId:actor.id,orderId:opts.orderIdAtSelection,
  orderKind:order?.kind??null,
  authoredGoal:order?.kind==='move'?order.p:null,
  goalKey:actor.routeGoalKey,from:actor.p,prior:actor.nav,
  next:opts.route,seconds:session.seconds,
  blockedSeconds:actor.blockedTime,blocker:actor.lastBlocker??null,
  owner:opts.owner,doorId:actor.doorTraversal?.doorId??null,
  retryRouteAt:actor.retryRouteAt,
  lastRepairAt:actor.lastNavRepairAt,
  recoveryAttempts:actor.recoveryAttempts,
  evidence:opts.evidence
 };
}
export type AdoptionWitnessFamily='ordinary'|'acquisition';
type AdoptionWitness={
 family:AdoptionWitnessFamily;source:RouteSource;
 orderId:number|null;from:Pt;goal:Pt;selectedAt:number;
 negative:boolean
};
const adoptionByActor=new WeakMap<TeamActor,AdoptionWitness>();
const clone=(p:Pt):Pt=>({x:p.x,y:p.y});
/** The most recent adopted transient proposal wins. No per-tick observers,
 * new gameplay clocks, or duplicate WeakMaps; reading does not write.
 */
export function recordAdoptionWitness(
 actor:TeamActor,family:AdoptionWitnessFamily,
 source:RouteSource,goal:Pt,selectedAt:number,negative=false
):void{
 adoptionByActor.set(actor,{
  family,source,orderId:actor.plan[0]?.id??null,
  from:clone(actor.p),goal:clone(goal),selectedAt,negative
 });
}
export type AdoptionWitnessView={
 source:RouteSource;state:'provisional'|'moved'|'no-route'|'superseded';
 distance:number;remaining:number;selectedAt:number
};
/** A failed initial query is not movement even if the actor later moves:
 * it remains 'no-route' until a subsequent real acquisition wins.
 * Order supersession always takes precedence.
 */
export function readAdoptionWitness(
 actor:TeamActor,family:AdoptionWitnessFamily
):AdoptionWitnessView|null{
 const w=adoptionByActor.get(actor);
 if(!w||w.family!==family)return null;
 const distance=recoveryDistance(actor.p,w.from);
 return {
  source:w.source,
  state:actor.plan[0]?.id!==w.orderId?'superseded':
   w.negative?'no-route':distance>=.3?'moved':'provisional',
  distance,remaining:recoveryDistance(actor.p,w.goal),
  selectedAt:w.selectedAt
 };
}
