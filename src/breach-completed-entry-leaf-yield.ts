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
 // Other doors use the existing physical swing arbitration. The specific
 // entry door may remain blocked by a soldier who has reached their sector.
 if(doorId!==prior.doorId)return true;
 return gap(candidate,prior.goal)<=COMPLETED_ENTRY_REST_RADIUS;
}
