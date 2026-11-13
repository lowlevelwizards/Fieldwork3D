/** D4 — one physical support-hand attachment, driven by the existing hinge.
 * The episode flags are compatibility mirrors, NOT another pose controller.
 * Only real accepted body contact can acquire. No collision exemptions,
 * moving bodies, per-tick impulse injection, remote handles or extra IK.
 */
import {doorLeafSegment,pointToSegment,type Door,type Pt}
 from './breach-core.ts';
import {handlePoint,PUSHED_OPEN_LIMIT} from './breach-door.ts';
import type {SessionWorldGeometry} from './breach-world-context.ts';
import type {TeamActor} from './breach-game.ts';
import {DOOR_HAND_ACQUIRE_REACH,DOOR_HAND_RELEASE_REACH,
 DOOR_HAND_RELEASE_DURATION} from './breach-door-grip-constants.ts';
export {DOOR_HAND_ACQUIRE_REACH,DOOR_HAND_RELEASE_REACH,
 DOOR_HAND_RELEASE_DURATION} from './breach-door-grip-constants.ts';
export type DoorGripRecord={
 doorId:string;fraction:number;mode:'handle'|'panel';
 startedAt:number;releasedAt:number|null;point:Pt;
};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(x:number,lo:number,hi:number)=>
 Math.max(lo,Math.min(hi,x));
export function doorGripPoint(d:Door,fraction:number):Pt{
 const leaf=doorLeafSegment(d);
 return {x:leaf.a.x+(leaf.b.x-leaf.a.x)*fraction,
   y:leaf.a.y+(leaf.b.y-leaf.a.y)*fraction};
}
function handAvailable(a:TeamActor,seconds:number):boolean{
 const n=a.plan[0],e=a.doorTraversal;
 return !!n&&!!e&&e.doorId!==undefined&&n.id===e.authoredOrderId&&
   (n.kind==='move'||n.kind==='pie')&&a.side==='blue'&&
   a.health>0&&!a.surrendered&&!a.traversal&&!a.traversalPending&&
   a.reload<=0&&!a.treatmentActive&&a.pace!=='run'&&
   n.moveMode!=='sprint'&&(a.targetId===null||a.targetId===undefined)&&
   (a.aim??0)<.45&&seconds-(a.lastShotAt??-100)>.40&&
   seconds-(a.lastThrowAt??-100)>.7&&
   seconds-(a.lastBashAt??-100)>.6&&
   (a.flashUntil??0)<=seconds&&
   e.phase!=='release'&&e.phase!=='blocked';
}
function validDoor(a:TeamActor,d:Door):boolean{
 return a.doorTraversal?.doorId===d.id&&d.open&&
   !d.wedged&&!d.jammed&&!d.locked&&!d.heldBy&&
   d.kind!=='sliding'&&d.kind!=='shutter';
}
function canReachWall(world:SessionWorldGeometry|undefined,
 from:Pt,to:Pt):boolean{
 return !world?.staticWallBlocksRay({a:from,b:to});
}
function chooseContact(a:TeamActor,d:Door,seconds:number,
 world?:SessionWorldGeometry):{
 fraction:number;mode:'handle'|'panel';point:Pt
}|null{
 if(!validDoor(a,d)||!handAvailable(a,seconds))return null;
 const leaf=doorLeafSegment(d),handle=handlePoint(d);
 const dx=leaf.b.x-leaf.a.x,dy=leaf.b.y-leaf.a.y;
 const squared=Math.max(1,dx*dx+dy*dy);
 const along=clamp(((a.p.x-leaf.a.x)*dx+
   (a.p.y-leaf.a.y)*dy)/squared,.45,.86);
 const nearHandle=distance(a.p,handle)<=DOOR_HAND_ACQUIRE_REACH;
 const fraction=nearHandle?.82:along;
 const point=doorGripPoint(d,fraction);
 if(distance(a.p,point)>DOOR_HAND_ACQUIRE_REACH||
   pointToSegment(a.p,leaf)>DOOR_HAND_ACQUIRE_REACH||
   !canReachWall(world,a.p,point))return null;
 return {fraction,mode:nearHandle?'handle':'panel',point};
}
/** Used by the existing body pressure policy. The physical contact
 * solver still checks an actual closing-face body sweep first. */
export function canDoorHandAssist(a:TeamActor,d:Door,
 seconds:number,world?:SessionWorldGeometry):boolean{
 return chooseContact(a,d,seconds,world)!==null;
}
/** Called ONLY after the real door's pressure solver reports handAssist.
 * No speculative radius trigger, distant grip or authored plan rewrite. */
export function beginDoorGrip(a:TeamActor,d:Door,seconds:number,
 world?:SessionWorldGeometry):boolean{
 const found=chooseContact(a,d,seconds,world);
 if(!found)return false;
 const current=a.doorGrip;
 if(current?.releasedAt===null&&current.doorId===d.id)return true;
 const record:DoorGripRecord={doorId:d.id,fraction:found.fraction,
   mode:found.mode,point:found.point,startedAt:seconds,releasedAt:null};
 a.doorGrip=record;
 const e=a.doorTraversal!;
 e.handContact=true;e.handContactSince=seconds;
 if(e.maneuver==='direct'||e.maneuver==='push-through')
  e.maneuver='grab-and-hold';
 a.lastDoorId=d.id;a.lastDoorMethod='open';
 return true;
}
/** Retain a tiny presentation release record without retaining hinge force. */
export function releaseDoorGrip(a:TeamActor,seconds:number):void{
 const record=a.doorGrip;
 if(record&&record.releasedAt===null)record.releasedAt=seconds;
 const e=a.doorTraversal;
 if(e?.handContact){
  e.handContact=false;e.handContactSince=null;
  if(e.maneuver==='grab-and-hold')e.maneuver='direct';
 }
 if(record&&a.lastDoorId===record.doorId)
  a.lastDoorAt=Math.min(a.lastDoorAt,seconds-1.13);
}
export function canMaintainDoorGrip(a:TeamActor,d:Door,seconds:number,
 world?:SessionWorldGeometry):boolean{
 const record=a.doorGrip;
 if(!record||record.releasedAt!==null||record.doorId!==d.id||
   !handAvailable(a,seconds)||!validDoor(a,d))return false;
 const point=doorGripPoint(d,record.fraction);
 return distance(a.p,point)<=DOOR_HAND_RELEASE_REACH&&
   canReachWall(world,a.p,point);
}
/** Live heartbeat: one attached actor, one cheap reach test per fixed tick.
 * The main globally-swept hinge phase remains the sole physics authority. */
export function updateDoorGrip(a:TeamActor,d:Door,seconds:number,
 world?:SessionWorldGeometry):boolean{
 if(!canMaintainDoorGrip(a,d,seconds,world)){
  releaseDoorGrip(a,seconds);return false;
 }
 const record=a.doorGrip!;
 const target=doorGripPoint(d,record.fraction);
 record.point.x=target.x;record.point.y=target.y;
 if(a.doorTraversal){
  a.doorTraversal.handContact=true;
  a.doorTraversal.handContactSince=record.startedAt;
 }
 if((d.openFraction??0)<PUSHED_OPEN_LIMIT-.01)
  d.pushTarget=PUSHED_OPEN_LIMIT;
 return true;
}
export function maintainDoorGrip(a:TeamActor,doors:readonly Door[],
 seconds:number,world?:SessionWorldGeometry):void{
 const record=a.doorGrip;
 if(!record)return;
 if(record.releasedAt!==null){
  if(seconds-record.releasedAt>=DOOR_HAND_RELEASE_DURATION)
   a.doorGrip=null;
  return;
 }
 let door:Door|undefined;
 for(const candidate of doors)
  if(candidate.id===record.doorId){door=candidate;break;}
 if(!door)releaseDoorGrip(a,seconds);
 else updateDoorGrip(a,door,seconds,world);
}
