/** D3.36: a full-size body can remain route-less after a fully opened
 * local leaf; its stale D1 episode must not reserve the door forever.
 * This ONLY claims an observed stationary authored MOVE with no physical
 * hand or door maneuver left to execute. It never moves an actor.
 */
import type {TeamActor} from './breach-game.ts';
import type {Door,Pt} from './breach-core.ts';
import {OPERATOR_RADIUS,doorLeafSegment,pointToSegment}
 from './breach-core.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
type Claim={orderId:number;doorId:string;goal:Pt;at:Pt;
 revision:number};
const attempted=new WeakMap<TeamActor,Claim>();
/** At most ONE expensive next-door prefix attempt at an unchanged
 * physically stranded actor/GO/hinge/world. Real changed geometry or
 * genuine >=12u foot movement is required to restore the entitlement.
 */
export function claimColdBlockedOpenLeafContinuation(
 actor:TeamActor,goal:Pt,door:Door,seconds:number,revision:number
):boolean{
 const order=actor.plan[0],e=actor.doorTraversal;
 if(actor.side!=='blue'||order?.kind!=='move'||
    order.entryDoorId||order.stackDoorId||
    d(order.p,goal)>.5||actor.nav.length!==0||
    actor.lastBlocker!=='route'||actor.blockedTime<3||
    actor.recoveryAttempts<2||
    actor.squeeze||actor.traversal||actor.traversalPending||
    actor.autoSidestep||actor.fireRetreatTarget||
    actor.doorHandContact?.releasedAt===null||
    !e||e.authoredOrderId!==order.id||e.doorId!==door.id||
    e.phase!=='blocked'||e.maneuver!=='direct'||
    e.handContact||e.waypoints.length!==0||
    seconds-e.lastProgressAt<2.5||
    !door.open||door.kind==='shutter'||door.kind==='sliding'||
    door.locked||door.jammed||door.wedged||door.heldBy||
    (door.openFraction??0)<.98||
    Math.abs(door.angularVelocity??0)>=.16||
    pointToSegment(actor.p,doorLeafSegment(door))>=
      OPERATOR_RADIUS+24||
    d(actor.p,goal)<35||
    !Number.isFinite(seconds)||!Number.isFinite(revision)||
    seconds<actor.retryRouteAt)return false;
 const prior=attempted.get(actor);
 if(prior&&prior.orderId===order.id&&prior.doorId===door.id&&
    d(prior.goal,goal)<.5&&d(prior.at,actor.p)<12&&
    prior.revision===revision)return false;
 attempted.set(actor,{orderId:order.id,doorId:door.id,
   goal:{...goal},at:{...actor.p},revision});
 return true;
}
