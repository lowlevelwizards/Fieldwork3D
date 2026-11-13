/** Incidental hinged-door pressure arbitration.
 * Teammates actively crossing a threshold must not be closed against.
 * A player's explicit OPEN/CLOSE order remains authoritative.
 */
import type {TeamActor} from './breach-game.ts';
import type {Door} from './breach-core.ts';
import {crossingDoor} from './breach-passage.ts';
/** One current-order crossing-intent predicate for motor and incidental
 * hinge contact. Queue rank is a separate GO-time concern.
 * Door/sync actions may protect a leaf while in use but cannot acquire
 * movement priority. An unrelated traversal episode is never substituted.
 */
export function activeDoorCrossingIntent(
 actor:TeamActor,door:Door,includeDoorActions=false
):boolean{
 const order=actor.plan[0];
 if(!order||actor.health<=0)return false;
 const walking=order.kind==='move'||order.kind==='pie';
 if(!walking&&!(includeDoorActions&&
   (order.kind==='door'&&order.method!=='close'||order.kind==='sync')))
  return false;
 const episode=actor.doorTraversal;
 const goal=episode?.doorId===door.id&&episode.authoredOrderId===order.id?
   episode.destination:actor.nav.at(-1)??order.p;
 return crossingDoor({id:actor.id,p:actor.p,goal,
   side:actor.side,active:true,health:actor.health,
   blockedTime:actor.blockedTime},door);
}
export function operatorCrossingDoor(actor:TeamActor,door:Door):boolean{
 return activeDoorCrossingIntent(actor,door);
}
export function incidentalCloseWouldBlockTeammate(
 actors:readonly TeamActor[],actor:TeamActor,door:Door
):boolean{
 if(operatorCrossingDoor(actor,door))return true;
 // The same current-order intent that governs touched-leaf pressure
 // protects the whole friendly crossing. No separate goal guessing here.
 return actors.some(peer=>peer!==actor&&peer.side===actor.side&&
   activeDoorCrossingIntent(peer,door,true));
}
