/** D3.30B: explicit player-owned retry, never an automatic AI unlock.
 * The selected door was identified by an actual prior terminal failure.
 * A resolved lock does not itself enqueue anything: this command is called
 * only after a player explicitly chooses RESUME during planning.
 */
import type {Session} from './breach-game.ts';
import {party,canEdit} from './breach-session-selectors.ts';
import {edit} from './breach-plan-authoring.ts';
import {copyNodes} from './breach-plan.ts';
import {doorSecuredFrom} from './breach-door-security.ts';
import {doorClear} from './breach-door.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {intelPassable} from './breach-intel.ts';
import {SQUEEZE_RADIUS} from './breach-navigation.ts';

/** This is a deliberate order authoring action, not an execution shortcut.
 * Restored instructions are fresh IDs ahead of unrelated queued orders.
 * All resulting physical passage still runs through the normal motor.
 */
export function canResumeInterruptedDoorPlan(s:Session,actorId:string):boolean{
 const a=party(s,actorId);
 if(!a||!canEdit(s)||!a.interruptedDoorPlan)return false;
 const snap=a.interruptedDoorPlan;
 if(!snap.doorId||!snap.original.length)return false;
 const door=s.doors.find(d=>d.id===snap.doorId);
 if(!door||doorSecuredFrom(door,a.p)||door.jammed||door.wedged||
    door.heldBy)return false;
 // A generated follower WAIT may only be requeued after a genuinely
 // physically clear opening; a normal authored MOVE can open an unlocked
 // leaf itself through the unchanged motor authority.
 if(snap.original.some(n=>n.kind==='wait'&&n.duration===0)&&
   !doorClear(door,sessionWorldGeometry(s)))return false;
 if(snap.original.some(n=>
   (n.kind==='move'||n.kind==='door')&&
   !intelPassable(n.p,s.intel,SQUEEZE_RADIUS)))return false;
 return true;
}
export function resumeInterruptedDoorPlan(s:Session,actorId:string):boolean{
 if(!canResumeInterruptedDoorPlan(s,actorId))return false;
 const a=party(s,actorId)!;
 const snap=a.interruptedDoorPlan!;
 const accepted=edit(s,a,()=>{
  const restored=copyNodes(snap.original).map(n=>({...n,id:s.nextId++}));
  a.plan.unshift(...restored);
 });
 if(accepted)a.interruptedDoorPlan=null;
 return accepted;
}
