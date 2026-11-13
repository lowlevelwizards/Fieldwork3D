/** D3 fixed-tick, session-scoped door-pressure arbitration.
 * Read crossing claims ONCE for each session/physics tick. Both the
 * no-route motor and swept collision use the same intent snapshot.
 * Each door accepts at most one incidental BODY impulse per tick.
 * Explicit author-issued OPEN/CLOSE and the main hinge phase remain
 * independent, with the CLOSE order yielding while the passage is in use.
 *
 * This never caches body positions or physical swept clearance. Those
 * remain live and exact at the moment a hinge or actor attempts to move.
 */
import type {Session,TeamActor} from './breach-game.ts';
import type {Door} from './breach-core.ts';
import {crossingDoor} from './breach-passage.ts';
import type {BodyDoorPressurePolicy} from './breach-door.ts';

type TickClaims={
 at:number;
 protectedBySide:Set<string>;
 occupiedDoors:Set<string>;
 actorsOpening:Set<string>;
 claimedImpulses:Set<string>;
};
const cache=new WeakMap<Session,TickClaims>();
const sideKey=(doorId:string,side:string)=>doorId+'|'+side;
const actorKey=(actorId:string,doorId:string)=>actorId+'|'+doorId;
export function doorPressureTick(s:Session):TickClaims{
 const prior=cache.get(s);
 if(prior&&prior.at===s.seconds)return prior;
 const tick:TickClaims={
  at:s.seconds,protectedBySide:new Set(),occupiedDoors:new Set(),
  actorsOpening:new Set(),claimedImpulses:new Set()
 };
 for(const actor of s.operators){
  if(actor.health<=0||!actor.plan.length)continue;
  const n=actor.plan[0];
  if(!['move','pie','door','sync'].includes(n.kind)||
     n.kind==='door'&&n.method==='close')continue;
  const episode=actor.doorTraversal;
  const goal=episode?.authoredOrderId===n.id?
    episode.destination:actor.nav.at(-1)??n.p;
  for(const door of s.doors){
   // No claiming a remote door or a next order after WAIT/RELOAD.
   if(!crossingDoor({id:actor.id,p:actor.p,goal,
     side:actor.side,health:actor.health,active:true,
     blockedTime:actor.blockedTime},door))continue;
   tick.protectedBySide.add(sideKey(door.id,actor.side));
   tick.occupiedDoors.add(door.id);
   tick.actorsOpening.add(actorKey(actor.id,door.id));
  }
 }
 cache.set(s,tick);
 return tick;
}
/** The current actor may pull a physically reachable panel; no remote
 * manipulation is authorized here. Actual contact is validated by
 * pressDoorOnBodyAttempt and its full hinge/body collision sweeps.
 */
export function sessionDoorPressurePolicy(
 s:Session,actor:TeamActor
):BodyDoorPressurePolicy{
 const frame=doorPressureTick(s);
 return {
  preferOpening:door=>frame.actorsOpening.has(actorKey(actor.id,door.id)),
  deferClosing:door=>frame.protectedBySide.has(
    sideKey(door.id,actor.side)),
  claimContact:door=>{
   if(frame.claimedImpulses.has(door.id))return false;
   frame.claimedImpulses.add(door.id);
   return true;
  }
 };
}
/** An explicitly ordered CLOSE waits for actual active crossing claims,
 * but still remains the player's order and completes when traffic clears.
 */
export function doorClosingContested(
 s:Session,door:Door
):boolean{
 return doorPressureTick(s).occupiedDoors.has(door.id);
}
