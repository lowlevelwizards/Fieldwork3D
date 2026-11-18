/** D3.30B: explicit player-owned retry, never an automatic AI unlock.
 * The selected door was identified by an actual prior terminal failure.
 * A resolved lock does not itself enqueue anything: this command is called
 * only after a player explicitly chooses RESUME during planning.
 */
import type {Session,TeamActor} from './breach-game.ts';
import {party,team,canEdit} from './breach-session-selectors.ts';
import {edit,atomicTeamEdit} from './breach-plan-authoring.ts';
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


/** D3.30H: squad-wide offers use *past witnessed authoring* only. Do not
 * inspect live locks here: otherwise unlocking unseen could leak via UI.
 */
function generatedIncidentAt(a:TeamActor,doorId:string):boolean{
 const snap=a.interruptedDoorPlan;
 return snap?.doorId===doorId&&snap.original.some(n=>
  n.kind==='move'&&n.entryDoorId===doorId||
  n.kind==='wait'&&n.duration===0&&n.doorId===doorId) || false;
}
function interruptedSquad(s:Session,actorId:string):TeamActor[]{
 const initiator=party(s,actorId);
 const doorId=initiator?.interruptedDoorPlan?.doorId;
 if(!doorId||!initiator||!generatedIncidentAt(initiator,doorId))return [];
 // The physical incident's approach side is immutable. Never group
 // opposite-side entries simply because their saved door ID matches.
 // Older snapshots without side provenance retain the legacy fallback.
 const side=initiator.interruptedDoorPlan?.approachSide;
 return team(s).filter(a=>{
  if(a.health<=0||!generatedIncidentAt(a,doorId))return false;
  const otherSide=a.interruptedDoorPlan?.approachSide;
  return !side||!otherSide||side===otherSide;
 });
}
export function hasInterruptedSquadEntry(s:Session,actorId:string):boolean{
 return interruptedSquad(s,actorId).length>=2;
}
/** One player action, one atomic authoring transaction, one shared undo.
 * Each eligible member gets fresh order IDs ahead of unrelated orders.
 * A rejected member aborts the entire action without changing any plan,
 * nextId, undo history, or saved interruption snapshot.
 */
export function resumeInterruptedSquadEntry(s:Session,actorId:string):boolean{
 const members=interruptedSquad(s,actorId);
 if(members.length<2||!canEdit(s)||
    !members.every(a=>canResumeInterruptedDoorPlan(s,a.id)))return false;
 const committed=atomicTeamEdit(s,members,()=>{
  for(const a of members){
   const original=a.interruptedDoorPlan!.original;
   const restored=copyNodes(original).map(n=>({...n,id:s.nextId++}));
   a.plan.unshift(...restored);
  }
  return true;
 });
 if(committed)for(const a of members)a.interruptedDoorPlan=null;
 return committed;
}
