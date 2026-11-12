/** Incidental hinged-door pressure arbitration.
 * Teammates actively crossing a threshold must not be closed against.
 * A player's explicit OPEN/CLOSE order remains authoritative.
 */
import type {TeamActor} from './breach-game.ts';
import type {Door} from './breach-core.ts';
import {crossingDoor} from './breach-passage.ts';
/** Player crossing intent is read from the active authored move, not a
 * future route or explicit CLOSE/HOLD command. */
export function operatorCrossingDoor(actor:TeamActor,door:Door):boolean{
 const order=actor.plan[0];
 if(!order||(order.kind!=='move'&&order.kind!=='pie'))return false;
 const goal=actor.nav.at(-1)??order.p;
 return crossingDoor({id:actor.id,p:actor.p,goal,
   side:actor.side,active:true,health:actor.health,
   blockedTime:actor.blockedTime},door);
}
export function incidentalCloseWouldBlockTeammate(
 actors:readonly TeamActor[],actor:TeamActor,door:Door
):boolean{
 if(operatorCrossingDoor(actor,door))return true;
 return actors.some(peer=>{
  if(peer===actor||peer.side!==actor.side||peer.health<=0)return false;
  const order=peer.plan[0];
  if(!order||!['move','door','sync'].includes(order.kind))return false;
  const goal=peer.nav.at(-1)??order.p;
  return crossingDoor({
   id:peer.id,p:peer.p,goal,side:peer.side,
   active:true,health:peer.health,blockedTime:peer.blockedTime
  },door);
 });
}
