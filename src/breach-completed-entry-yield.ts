/** D3.20B: an operator who has physically completed a GENERATED ENTRY
 * keeps that achieved interior landing while yielding to later arrivals.
 * No collision overrides, order edits, invented motion or new controller.
 *
 * Only ordinary idle traffic yield consults this guard. Active motor motion
 * remains authoritative and can take the operator anywhere legally routed.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';

const anchors=new WeakMap<TeamActor,{orderId:number;goal:Pt}>();
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
// R7 motor truth counts physical arrival strictly inside 16 world units.
// Keep a small numerical margin so ordinary idle yields don't undo arrival.
const MAX_ENTRY_REST_DISTANCE=15.5;

export function noteCompletedGeneratedEntry(
 actor:TeamActor,orderId:number,goal:Pt
):void{
 anchors.set(actor,{orderId,goal:{...goal}});
}
/** The first newly executed order supersedes any earlier resting anchor. */
export function releaseCompletedGeneratedEntry(
 actor:TeamActor,currentOrderId:number
):void{
 const saved=anchors.get(actor);
 if(saved&&saved.orderId!==currentOrderId)anchors.delete(actor);
}
export function legalCompletedEntryIdleYield(
 actor:TeamActor,next:Pt
):boolean{
 const saved=anchors.get(actor);
 return !saved||distance(next,saved.goal)<=MAX_ENTRY_REST_DISTANCE;
}
