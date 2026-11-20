/** D3.17B: one actor-scoped, collision-only route recurrence gate.
 * Prevent repeated identical TRANSIENT route assignments from one physical
 * anchor when no meaningful goal progress occurred. No authored plan edits,
 * physics authority, route searches, or per-frame allocations.
 */
import type {TeamActor} from './breach-game.ts';
import type {Pt} from './breach-core.ts';

type Witness={
 orderId:number;token:string;goal:Pt;first:Pt;anchor:Pt;
 bestRemaining:number;firstAt:number;lastAt:number;count:number;
};
const byActor=new WeakMap<TeamActor,Map<string,Witness>>();
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);

/** Return false only after FOUR near-identical route reissues from the same
 * real position/GO, without >=3 units of goal progress. Re-probe after 8s,
 * significant physical relocation, goal/door changes, or a new order.
 * This is an expensive-recovery callsite gate, NEVER a movement/GO gate.
 */
export function allowPhysicalRouteReissue(
 actor:TeamActor,family:'door-rehearsal'|'full-body-lane'|'blocked-leg-connector'|'collision-replan'|'frame-actor-detour',
 goal:Pt,route:readonly Pt[],seconds:number,token=''
):boolean{
 const order=actor.plan[0];
 if(actor.side!=='blue'||order?.kind!=='move'||!route.length)return true;
 let states=byActor.get(actor);
 if(!states){states=new Map();byActor.set(actor,states);}
 const previous=states.get(family);
 const remaining=distance(actor.p,goal);
 // A backward portal-only maneuver can be individually swept-clear yet
 // repeatedly undo a good approach. Keep a longer *same-anchor* witness
 // only for that proven case; productive and full-GO rehearsals retain
 // the normal B gate.
 const backwardDoor=family==='door-rehearsal'&&
   distance(route[route.length-1],goal)>remaining+3;
 const maxAge=backwardDoor?18:8;
 const allowed=backwardDoor?3:4;
 const same=!!previous&&previous.orderId===order.id&&
   previous.token===token&&distance(previous.goal,goal)<.5&&
   distance(previous.first,route[0])<3&&
   distance(previous.anchor,actor.p)<3&&
   seconds-previous.lastAt<(backwardDoor?7:5)&&
   seconds-previous.firstAt<maxAge&&
   remaining>=previous.bestRemaining-3;
 if(!same){
   states.set(family,{orderId:order.id,token,
     goal:{...goal},first:{...route[0]},anchor:{...actor.p},
     bestRemaining:remaining,firstAt:seconds,lastAt:seconds,count:1});
   return true;
 }
 previous.count++;
 previous.lastAt=seconds;
 previous.bestRemaining=Math.min(previous.bestRemaining,remaining);
 return previous.count<allowed;
}
