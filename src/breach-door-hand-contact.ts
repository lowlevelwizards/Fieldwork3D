/** D4: motor-authoritative moving-leaf support-hand contact.
 * A grip begins only on a genuine reachable physical handle/leaf contact.
 * It is sustained across fixed ticks while the crossing, reach and hand
 * availability are valid; no remote force, collision bypass or second hinge.
 */
import {doorLeafSegment,pointToSegment,
 type Door,type Pt} from './breach-core.ts';
import {handlePoint,PUSHED_OPEN_LIMIT} from './breach-door.ts';
import {signedDoorSide} from './breach-door-traversal-episode.ts';
import type {TeamActor,Session} from './breach-game.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {implicitDoorOpeningOwner} from './breach-door-opening-ownership.ts';
import {DOOR_HAND_ACQUIRE_REACH,DOOR_HAND_RELEASE_REACH,
 DOOR_HAND_RELEASE_DURATION} from './breach-door-hand-constants.ts';
export {DOOR_HAND_ACQUIRE_REACH,DOOR_HAND_RELEASE_REACH,
 DOOR_HAND_RELEASE_DURATION} from './breach-door-hand-constants.ts';

export type DoorHandContact={
 doorId:string;
 /** Stable fraction along the actual pivot-to-tip panel. */
 fraction:number;
 mode:'handle'|'panel';
 startedAt:number;
 /** Null while truly attached; finite on release for smooth visual return. */
 releasedAt:number|null;
 point:Pt;
};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x));
export const doorHandPoint=(door:Door,fraction:number):Pt=>{
 const leaf=doorLeafSegment(door);
 return {x:leaf.a.x+(leaf.b.x-leaf.a.x)*fraction,
   y:leaf.a.y+(leaf.b.y-leaf.a.y)*fraction};
};
function handFree(a:TeamActor):boolean{
 return a.health>0&&!a.surrendered&&!a.traversal&&!a.traversalPending&&
  a.reload<=0&&!a.treatmentActive&&a.pace!=='run'&&
  a.plan[0]?.moveMode!=='sprint'&&
  a.plan[0]?.kind!=='tool'&&
  a.plan[0]?.kind!=='door'&&
  a.targetId===null&&a.aim<.45;
}
function handFreeAt(a:TeamActor,now:number):boolean{
 return handFree(a)&&a.flashUntil<=now&&
  a.lastThrowAt<now-.72&&a.lastBashAt<now-.60;
}
/** No limb motion through static walls, even though the target itself sits
 * ON a physical leaf. The arm ray is narrow, unlike the full body capsule.
 */
function rayClear(s:Session,from:Pt,to:Pt):boolean{
 return !sessionWorldGeometry(s).staticWallBlocksRay({a:from,b:to});
}
function validCrossing(a:TeamActor,door:Door):boolean{
 const e=a.doorTraversal,n=a.plan[0];
 if(!e||!n||e.doorId!==door.id||e.authoredOrderId!==n.id||
    e.phase==='release'||e.phase==='blocked'||a.side!=='blue')
  return false;
 return signedDoorSide(a.p,door)*e.approachSide>-(8+8);
}
/** Shared physical reach gate for D3 pressure and D4 attachment.
 * No phantom pull when the hand is occupied, across a wall or too far.
 */
function handCandidate(s:Session,a:TeamActor,door:Door):{
 fraction:number;mode:'handle'|'panel';point:Pt
}|null{
 if(!door.open||door.wedged||door.locked||door.jammed||
    door.heldBy||door.kind==='sliding'||door.kind==='shutter'||
    !validCrossing(a,door)||!handFreeAt(a,s.seconds))return null;
 const handle=handlePoint(door);
 const leaf=doorLeafSegment(door);
 const dx=leaf.b.x-leaf.a.x,dy=leaf.b.y-leaf.a.y;
 const magnitude=Math.max(1,dx*dx+dy*dy);
 const closest=clamp(((a.p.x-leaf.a.x)*dx+
   (a.p.y-leaf.a.y)*dy)/magnitude,.45,.86);
 const atHandle=distance(a.p,handle)<=DOOR_HAND_ACQUIRE_REACH;
 const fraction=atHandle?.82:closest;
 const point=doorHandPoint(door,fraction);
 if(distance(a.p,point)>DOOR_HAND_ACQUIRE_REACH||
    pointToSegment(a.p,leaf)>DOOR_HAND_ACQUIRE_REACH||
    !rayClear(s,a.p,point))return null;
 return {fraction,mode:atHandle?'handle':'panel',point};
}
export function canDoorHandAssist(
 s:Session,a:TeamActor,door:Door):boolean{
 return handCandidate(s,a,door)!==null;
}
/** Mark an actual physical grab. A decorative reach cannot acquire. */
export function acquireDoorHandContact(
 s:Session,a:TeamActor,door:Door,assisted:boolean
):boolean{
 if(!assisted)return false;
 const current=a.doorHandContact;
 if(current?.releasedAt===null&&current.doorId===door.id)return true;
 const candidate=handCandidate(s,a,door);
 if(!candidate)return false;
 const {fraction,mode,point}=candidate;
 a.doorHandContact={doorId:door.id,fraction,
  mode,startedAt:s.seconds,releasedAt:null,point};
 if(a.doorTraversal){
  a.doorTraversal.handContact=true;
  // Preserve a selected outside-leaf footpath while the same hand
  // physically helps keep the leaf clear.
  if(a.doorTraversal.maneuver!=='outside-leaf')
   a.doorTraversal.maneuver='grab-and-hold';
 }
 a.lastDoorId=door.id;a.lastDoorMethod='open';
 return true;
}
/** Called by explicit cancel/completion or the next simulation tick. */
export function releaseDoorHandContact(a:TeamActor,now:number):void{
 const contact=a.doorHandContact;
 if(!contact||contact.releasedAt!==null)return;
 contact.releasedAt=now;
 if(a.doorTraversal)a.doorTraversal.handContact=false;
}
/** Only attached actors do work. The hinge remains governed by advanceDoor
 * and its exact collision/world sweep in the next authoritative door phase.
 * No force or new impulse is injected each tick: a valid hand merely
 * requests the attainable opening target while retaining reach.
 */
export function maintainDoorHandContact(s:Session,a:TeamActor):void{
 const contact=a.doorHandContact;
 if(!contact)return;
 if(contact.releasedAt!==null){
  if(s.seconds-contact.releasedAt>=DOOR_HAND_RELEASE_DURATION)
   a.doorHandContact=null;
  return;
 }
 const door=s.doors.find(d=>d.id===contact.doorId);
 if(!door||!door.open||door.wedged||door.locked||door.jammed||
    door.heldBy||!validCrossing(a,door)||!handFreeAt(a,s.seconds)||
    ((door.openFraction??0)<.72&&
      implicitDoorOpeningOwner(s,door)!==a.id)){
  releaseDoorHandContact(a,s.seconds);return;
 }
 const point=doorHandPoint(door,contact.fraction);
 if(distance(a.p,point)>DOOR_HAND_RELEASE_REACH||
    !rayClear(s,a.p,point)){
  releaseDoorHandContact(a,s.seconds);return;
 }
 contact.point=point;
 if(a.doorTraversal)a.doorTraversal.handContact=true;
 // Opening is physically bounded by the real moving-leaf hinge sweeps.
 if((door.openFraction??0)<PUSHED_OPEN_LIMIT-.01)
  door.pushTarget=PUSHED_OPEN_LIMIT;
}
