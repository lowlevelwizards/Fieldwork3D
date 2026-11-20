/** A real completed GENERATED ENTRY landing stays near its authored GO
 * unless the player subsequently executes a new order. This is consulted
 * ONLY before optional physical door-opening yield, not by normal movement.
 * The leaf must instead obey ordinary body-blocking physics if no legal
 * yield stays inside the completed arrival envelope.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
const completeEntry=new WeakMap<TeamActor,{orderId:number;doorId:string;goal:Pt}>();
const gap=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export const COMPLETED_ENTRY_REST_RADIUS=15.5;
export function recordCompletedGeneratedEntry(
 actor:TeamActor,node:{id:number;entryDoorId:string;p:Pt}
):void{
 completeEntry.set(actor,{orderId:node.id,doorId:node.entryDoorId,
  goal:{...node.p}});
}
/** A historical, physically completed generated entry may establish that a
 * particular teammate crossed THIS door. A new active order invalidates the
 * rest witness; it never licenses physical movement or reveals a door.
 */
export function completedGeneratedEntryAt(actor:TeamActor,doorId:string):boolean{
 const prior=completeEntry.get(actor);
 return !!prior&&prior.doorId===doorId&&actor.plan.length===0;
}
export function clearCompletedEntryOnNewOrder(actor:TeamActor,orderId:number):void{
 const prior=completeEntry.get(actor);
 if(prior&&prior.orderId!==orderId)completeEntry.delete(actor);
}
/** Never suppress physical collision. A denied optional yield simply means
 * this door must wait for the actual operator's body to clear.
 */
export function allowOpeningYieldAtCompletedEntry(
 actor:TeamActor,doorId:string,candidate:Pt
):boolean{
 const prior=completeEntry.get(actor);
 if(!prior)return true;
 // Explicit new orders are never constrained by the old generated GO.
 if(actor.plan.length){
  completeEntry.delete(actor);
  return true;
 }
 // Every opening door must respect a legitimately achieved entry sector.
 // An unrelated interior leaf (Motel D5) can otherwise undo the completed
 // FRONT landing even though it has no authority to move an idle operator
 // indefinitely. If the legal yield would leave arrival range, the leaf
 // waits against the actual stationary actor collision.
 void doorId;
 return gap(candidate,prior.goal)<=COMPLETED_ENTRY_REST_RADIUS;
}
