/** D3 fixed-tick, session-scoped door-pressure arbitration.
 * Read crossing claims ONCE per touched DOOR per session/physics tick.
 * Untouched leaves incur no actor checks or per-tick door geometry.
 * Both the
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
 inspected:Set<string>;
};
const cache=new WeakMap<Session,TickClaims>();
const sideKey=(doorId:string,side:string)=>doorId+'|'+side;
const actorKey=(actorId:string,doorId:string)=>actorId+'|'+doorId;
export function doorPressureTick(s:Session):TickClaims{
 const prior=cache.get(s);
 if(prior&&prior.at===s.seconds)return prior;
 const tick:TickClaims={
  at:s.seconds,protectedBySide:new Set(),occupiedDoors:new Set(),
  actorsOpening:new Set(),claimedImpulses:new Set(),
  inspected:new Set()
 };
 cache.set(s,tick);
 return tick;
}
/** Lazy per-door claim snapshot: O(live actors near THIS leaf), once per
 * tick. Unrelated map doors are never scanned on each contact attempt. */
function inspectDoor(s:Session,tick:TickClaims,door:Door):void{
 if(tick.inspected.has(door.id))return;
 tick.inspected.add(door.id);
 const center={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
 for(const actor of s.operators){
  if(actor.health<=0||!actor.plan.length)continue;
  const n=actor.plan[0];
  if(!['move','pie','door','sync'].includes(n.kind)||
     n.kind==='door'&&n.method==='close')continue;
  const episode=actor.doorTraversal;
  const goal=episode?.authoredOrderId===n.id?
    episode.destination:actor.nav.at(-1)??n.p;
  // 66-unit physical claim radius before running exact crossing geometry.
  const dx=actor.p.x-center.x,dy=actor.p.y-center.y;
  if(dx*dx+dy*dy>66*66)continue;
  if(!crossingDoor({id:actor.id,p:actor.p,goal,
    side:actor.side,health:actor.health,active:true,
    blockedTime:actor.blockedTime},door))continue;
  tick.protectedBySide.add(sideKey(door.id,actor.side));
  tick.occupiedDoors.add(door.id);
  tick.actorsOpening.add(actorKey(actor.id,door.id));
 }
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
  preferOpening:door=>{
   inspectDoor(s,frame,door);
   return frame.actorsOpening.has(actorKey(actor.id,door.id));
  },
  deferClosing:door=>{
   inspectDoor(s,frame,door);
   return frame.protectedBySide.has(sideKey(door.id,actor.side));
  },
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
 const frame=doorPressureTick(s);
 inspectDoor(s,frame,door);
 return frame.occupiedDoors.has(door.id);
}
