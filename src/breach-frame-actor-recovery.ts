/** R1.03b: late motion-frame arbitration may reject a locally legal stride
 * when the opponent moved on this SAME fixed tick. The next motor step may
 * again look legally clear, so the regular static collision detour never
 * runs. A real, accumulated post-arbitration actor stall can use ONE
 * bounded, full-body swept, transient local detour. This predicate grants
 * no movement, route, queue or plan authority.
 */
import type {TeamActor} from './breach-game.ts';
type StalledActor=Pick<TeamActor,
 'side'|'plan'|'lastBlocker'|'blockedTime'|'lastNavRepairAt'|
 'squeeze'|'traversal'|'traversalPending'|'doorTraversal'|
 'fireRetreatTarget'|'motorPause'>;

export function eligibleFrameActorDetour(a:StalledActor,now:number):boolean{
 const order=a.plan[0];
 return a.side==='blue'&&order?.kind==='move'&&
  !order.stackDoorId&&!order.entryDoorId&&
  a.lastBlocker==='actor'&&a.blockedTime>=1.25&&
  now-a.lastNavRepairAt>=.85&&
  !a.squeeze&&!a.traversal&&!a.traversalPending&&
  !a.doorTraversal&&!a.fireRetreatTarget&&!a.motorPause;
}
