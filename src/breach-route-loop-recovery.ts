/** D3.13B: real-space route-circling witness.
 * A long course may initially take actors AWAY from the goal; never treat
 * Euclidean distance alone as evidence of a loop. Require meaningful travel
 * back into the SAME small area with no progress toward the authored goal.
 * This is a low-cost O(1) fixed-clock observer, with actor-lifetime state.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export type RouteLoopSnapshot={
 orderId:number;goalKey:string;startAt:number;start:Pt;previous:Pt;
 previousAt:number;initialRemaining:number;travel:number
};
const states=new WeakMap<TeamActor,RouteLoopSnapshot>();
const WINDOW_SECONDS=8;
const MIN_TRAVEL=100;
const MAX_NET_DISPLACEMENT=22;
const MIN_GOAL_PROGRESS=12;
export function observeRouteLoop(
 a:TeamActor,goal:Pt,seconds:number,eligible:boolean
):boolean{
 const order=a.plan[0];
 if(!eligible||order?.kind!=='move'||!Number.isFinite(seconds)){
  states.delete(a);return false;
 }
 const goalKey=Math.round(goal.x*2)+':'+Math.round(goal.y*2);
 const existing=states.get(a);
 if(!existing||existing.orderId!==order.id||
    existing.goalKey!==goalKey||
    seconds<existing.previousAt-.01||
    seconds-existing.previousAt>.6){
  states.set(a,{orderId:order.id,goalKey,startAt:seconds,
   start:{...a.p},previous:{...a.p},previousAt:seconds,
   initialRemaining:distance(a.p,goal),travel:0});
  return false;
 }
 existing.travel+=distance(a.p,existing.previous);
 existing.previous={...a.p};existing.previousAt=seconds;
 if(seconds-existing.startAt<WINDOW_SECONDS)return false;
 const net=distance(a.p,existing.start);
 const progress=existing.initialRemaining-distance(a.p,goal);
 const circling=existing.travel>=MIN_TRAVEL&&
   net<=MAX_NET_DISPLACEMENT&&progress<MIN_GOAL_PROGRESS;
 // One completed observation window per 8 seconds, no per-frame A* or
 // repeated immediate repair. Reset even when no loop was diagnosed.
 existing.startAt=seconds;existing.start={...a.p};existing.travel=0;
 existing.initialRemaining=distance(a.p,goal);
 return circling;
}
export function routeCourseLength(from:Pt,route:readonly Pt[]):number{
 let length=0,previous=from;
 for(const pt of route){length+=distance(previous,pt);previous=pt;}
 return length;
}
/** A new route is genuinely better, not merely different grid geometry.
 * All actual movement remains controlled by physical sweeps in the motor. */
export function worthwhileLoopRecovery(
 from:Pt,current:readonly Pt[],proposed:readonly Pt[]
):boolean{
 if(!current.length||!proposed.length)return false;
 const originalLength=routeCourseLength(from,current);
 const nextLength=routeCourseLength(from,proposed);
 return nextLength>=4&&originalLength>=25&&
   nextLength<originalLength*.78&&
   distance(current[0],proposed[0])>=8;
}
