/** Authoritative WAIT / HOLD CLEAR execution fragment.
 * Maintains the squad-entry door gate and contact-hold semantics without
 * changing the session step order or creating per-tick callback closures.
 */
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import {entryDoorState,leaderBeyondOpenEntry} from './breach-entry-coordination.ts';
import {doorSwingBlocked} from './breach-door.ts';
import {doorSecuredFrom} from './breach-door-security.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {failCurrentOrder} from './breach-order-lifecycle.ts';

export function advanceWaitOrder(
 s:Session,a:TeamActor,n:PlanNode,dt:number,
 hasSight:(observer:TeamActor,target:TeamActor,s:Session)=>boolean,
 notify:(s:Session,text:string)=>void,
 finish:(a:TeamActor)=>void
):void{
 if(n.kind!=='holdClear'&&n.kind!=='wait')return;
 if(n.kind==='wait'&&n.doorId){
  const doorway=s.doors.find(d=>d.id===n.doorId);
  const gate=entryDoorState(doorway,
   doorway?sessionWorldGeometry(s):undefined);
  // The fixed full-shoulder straight gate is conservative. When the
  // GENERATED squad's own leader has physically reached the opposite
  // side of this already-open door, allow the next operator to TRY the
  // authored entry instead of waiting forever on a false-negative
  // straight-line gate. Every real movement still runs the same body
  // sweep; this does not declare the aperture universally passable.
  const entry=n.duration===0?a.plan.find(next=>
    next.kind==='move'&&next.entryDoorId===n.doorId):undefined;
  // D3.25B: an automatic zero-duration follower gate must not outlive
  // its physically impossible locked/jammed doorway. Cancel only the
  // linked generated gate and its immediate generated ENTRY MOVE as
  // genuine failures, not successful arrivals. Player WAIT, WATCH and
  // unrelated later orders keep their normal authority.
  const locked=!!doorway&&doorSecuredFrom(doorway,a.p);
  const terminal=entry&&(!doorway||locked||doorway.jammed);
  if(terminal){
    const failure=!doorway?'DOOR MISSING':
      locked?'DOOR LOCKED':'DOOR JAMMED';
    const reason='SQUAD ENTRY CANCELLED · '+failure;
    failCurrentOrder(s,a,n,reason,notify);
    if(a.plan[0]?.id===entry.id)
      failCurrentOrder(s,a,entry,reason,notify);
    return;
  }
  const lead=entry?s.operators.find(other=>
    other.side===a.side&&other.health>0):undefined;
  const leadAcross=!!entry&&!!lead&&lead!==a&&
    leaderBeyondOpenEntry(doorway,lead.p,a.p,entry.p);
  if(gate!=='ready'&&!leadAcross){
   a.velocity=0;a.waitRemaining=0;a.actionTimer+=dt;
   if(a.actionTimer>=2.5&&a.actionTimer-dt<2.5){
    const stalledSwing=!!doorway&&doorway.open&&
     (doorway.openFraction??0)<.98&&
     doorSwingBlocked(doorway,
      Math.min(1,(doorway.openFraction??0)+.07),[],
      undefined,sessionWorldGeometry(s));
    notify(s,a.name+' ENTRY WAIT · '+
     (gate==='missing'?'DOOR MISSING':
      stalledSwing?'DOOR SWING OBSTRUCTED · CHECK ENTRY':
      'DOOR NOT CLEAR'));
   }
   return;
  }
  a.actionTimer=0;
 }
 const contact=s.operators.some(e=>
  e.side==='red'&&e.health>0&&hasSight(a,e,s));
 if(contact)a.motorPause='contact';
 a.waitRemaining=contact?0:a.waitRemaining+dt;
 a.velocity=0;
 if(a.waitRemaining>=(n.duration??(n.kind==='wait'?1:.5)))finish(a);
}
