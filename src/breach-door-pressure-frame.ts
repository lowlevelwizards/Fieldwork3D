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
import {doorLeafSegment,pointToSegment,OPERATOR_RADIUS,type Door} from './breach-core.ts';
import {activeDoorCrossingIntent} from './breach-door-pressure-arbitration.ts';
import type {BodyDoorPressurePolicy} from './breach-door.ts';
import {canDoorHandAssist} from './breach-door-hand-contact.ts';
import {mayManipulateOpening,claimContactReadyOpening,claimOpeningIntent}
 from './breach-door-opening-ownership.ts';

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
  // Restrict work to a touched, local leaf. Squad-entry members already
  // queued at this threshold protect it against accidental body CLOSE
  // even while their zero-duration door-clear WAIT is still active.
  // Otherwise a later-rank contact can slam the panel on the lead
  // between successive entry movements (Q2 outward-leaf regression).
  const dx=actor.p.x-center.x,dy=actor.p.y-center.y;
  if(dx*dx+dy*dy>80*80)continue;
  const queued=actor.plan.some(n=>n.kind==='move'&&
    n.entryDoorId===door.id);
  if(queued)tick.protectedBySide.add(sideKey(door.id,actor.side));
  const n=actor.plan[0];
  // R2.3: an active operator physically brushing an already OPEN leaf
  // is occupying that aperture even if a temporary nav leg means
  // signed-goal crossing recognition has not acquired a D2 episode.
  // This is evaluated ONLY in the existing touched-door, once-per-tick
  // actor loop. It prevents body-driven CLOSE while feet clear the panel;
  // explicit CLOSE and real hinge/body collision remain authoritative.
  if((n.kind==='move'||n.kind==='pie')&&door.open&&
     (door.openFraction??0)>.08&&
     pointToSegment(actor.p,doorLeafSegment(door))<OPERATOR_RADIUS+7){
    tick.protectedBySide.add(sideKey(door.id,actor.side));
    tick.occupiedDoors.add(door.id);
  }
  if(!['move','pie','door','sync'].includes(n.kind)||
     n.kind==='door'&&n.method==='close')continue;
  if(!activeDoorCrossingIntent(actor,door,true)&&
     !(n.kind==='move'&&n.entryDoorId===door.id))continue;
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
 // Construct arbitration sets only when a touched leaf requests them.
 return {
  canHandAssist:door=>
   mayManipulateOpening(s,actor,door)&&canDoorHandAssist(s,actor,door),
  preferOpening:door=>{
   const frame=doorPressureTick(s);
   inspectDoor(s,frame,door);
   if(!frame.actorsOpening.has(actorKey(actor.id,door.id)))return false;
   if(claimOpeningIntent(s,actor,door))return true;
   // Only a truly reachable free support hand can replace an anticipated
   // implicit opener. Physical leaf contact is still checked by the motor.
   return canDoorHandAssist(s,actor,door)&&
     claimContactReadyOpening(s,actor,door);
  },
  deferClosing:door=>{
   const frame=doorPressureTick(s);
   inspectDoor(s,frame,door);
   return frame.protectedBySide.has(sideKey(door.id,actor.side));
  },
  claimContact:door=>{
   // The selected opener alone may inject incidental pressure while the
   // leaf is incomplete; a follower's real swept feet remain unaffected.
   if(!claimOpeningIntent(s,actor,door))return false;
   const frame=doorPressureTick(s);
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
