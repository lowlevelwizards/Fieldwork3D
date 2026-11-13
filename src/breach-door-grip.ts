/** D4 — actual support-hand contact with a swinging hinged leaf.
 * A hand can start only on physical CONTACT returned by the swept motor.
 * Retaining the grip is a cheap reach/lifecycle check, not a new door
 * physics motor, remote pull, waypoint, teleport, or automatic aim command.
 */
import {type Door,type Pt} from './breach-core.ts';
import {DOOR_REACH,handlePoint} from './breach-door.ts';
import type {TeamActor} from './breach-game.ts';

const withinHandle=(p:Pt,d:Door):boolean=>{
 const handle=handlePoint(d);
 return (p.x-handle.x)**2+(p.y-handle.y)**2<=DOOR_REACH**2;
};
export function canMaintainDoorGrip(actor:TeamActor,door:Door,
 seconds:number):boolean{
 const order=actor.plan[0],e=actor.doorTraversal;
 if(!e||e.doorId!==door.id||!e.handContact||
    e.phase==='release'||e.phase==='blocked'||
    !door.open||door.wedged||door.kind==='shutter'||
    door.kind==='sliding'||actor.health<=0||actor.surrendered||
    !order||order.id!==e.authoredOrderId||
    (order.kind!=='move'&&order.kind!=='pie')||
    actor.reload>0||actor.treatmentActive||
    actor.traversal||actor.traversalPending||
    actor.pace==='run'||seconds-actor.lastShotAt<.4)
   return false;
 return withinHandle(actor.p,door);
}
/** A real closing-face body contact that was converted to a physical
 * pull authorizes the hand. Merely passing near a leaf does not. */
export function beginDoorGrip(actor:TeamActor,door:Door,
 seconds:number):boolean{
 const e=actor.doorTraversal;
 if(!e||e.doorId!==door.id||e.phase==='release'||
    !door.open||door.wedged||door.kind==='sliding'||
    door.kind==='shutter'||actor.health<=0||
    actor.reload>0||actor.treatmentActive||
    actor.pace==='run'||seconds-actor.lastShotAt<.4||
    !withinHandle(actor.p,door))return false;
 if(!e.handContact)e.handContactSince=seconds;
 e.handContact=true;
 e.maneuver='grab-and-hold';
 return true;
}
export function updateDoorGrip(actor:TeamActor,door:Door,
 seconds:number):boolean{
 const e=actor.doorTraversal;
 if(!e?.handContact)return false;
 if(!canMaintainDoorGrip(actor,door,seconds)){
  e.handContact=false;e.handContactSince=null;
  if(e.maneuver==='grab-and-hold')e.maneuver='direct';
  return false;
 }
 return true;
}
