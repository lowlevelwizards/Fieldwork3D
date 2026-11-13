/** Authoritative WAIT / HOLD CLEAR execution fragment.
 * Maintains the squad-entry door gate and contact-hold semantics without
 * changing the session step order or creating per-tick callback closures.
 */
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import {entryDoorState} from './breach-entry-coordination.ts';
import {doorSwingBlocked} from './breach-door.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';

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
  // Door-clear alone is insufficient: an ajar panel can be passable
  // before the opener has reached it, letting followers strike the leaf
  // into their own lead. Await the actual planned OPEN completion.
  const openerPending=s.operators.some(peer=>
   peer.id!==a.id&&peer.side==='blue'&&peer.health>0&&
   peer.plan[0]?.kind==='door'&&peer.plan[0]?.doorId===n.doorId&&
   peer.plan[0]?.method==='open');
  if(gate!=='ready'||openerPending){
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
