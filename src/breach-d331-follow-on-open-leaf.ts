/** D3.31: a physically blocked generated ENTRY operator may encounter an
 * ALREADY-STABLE OPEN **later** leaf after finishing its own threshold.
 * Once there is REAL door contact, permit one existing full-world route
 * recovery before the 0.85s stall mark. No proposed movement, opening,
 * new pathfinding algorithm, collision waiver or authored order changes.
 *
 * Guarded by the motor's own blocked step; never called on clear movement.
 */
import {OPERATOR_RADIUS,doorLeafSegment,pointToSegment,
 type Door,type Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function shouldProbeEarlyFollowOnOpenLeaf(
 actor:TeamActor,goal:Pt,doors:readonly Door[],now:number,
 physicallyBlocked:boolean
):boolean{
 const order=actor.plan[0];
 if(!physicallyBlocked||actor.side!=='blue'||order?.kind!=='move'||
    !order.entryDoorId||distance(order.p,goal)>.5||
    actor.doorTraversal||actor.traversal||actor.traversalPending||
    actor.squeeze||actor.fireRetreatTarget||actor.autoSidestep||
    !actor.nav.length||actor.lastBlocker!=='door'||
    actor.blockedTime<.35||actor.blockedTime>=.85||
    now-actor.lastNavRepairAt<.65||now<actor.retryRouteAt)
  return false;
 for(const door of doors){
  if(door.id===order.entryDoorId||!door.open||
     door.kind==='sliding'||door.kind==='shutter'||
     door.locked||door.jammed||door.wedged||door.heldBy||
     (door.openFraction??0)<.98||
     Math.abs(door.angularVelocity??0)>=.16)continue;
  const leaf=doorLeafSegment(door);
  // Only local actual contact with this second OPEN leaf, never a
  // remote GO/portal guess. Existing motor already denied this stride.
  if(pointToSegment(actor.p,leaf)<OPERATOR_RADIUS+12)return true;
 }
 return false;
}
