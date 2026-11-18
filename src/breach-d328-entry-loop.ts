/** D3.28B/C: recognize a real, repeated generated-STACK detour across
 * transient route SOURCES. This observes route SELECTIONS, not frame ticks,
 * and never edits positions, plan nodes, door states or route geometry.
 * Keep the witness keyed by actor and the exact current MOVE order.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';

const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
type Witness={
 orderId:number;goal:Pt;anchor:Pt;first:Pt;
 firstAt:number;lastAt:number;count:number;
 bestRemaining:number;attempts:number;lastAttempt:number;
};
const witnesses=new WeakMap<TeamActor,Witness>();
const clone=(p:Pt)=>({x:p.x,y:p.y});
const qualifying=(a:TeamActor,goal:Pt):boolean=>{
 const order=a.plan[0];
 return a.side==='blue'&&order?.kind==='move'&&
  !!order.stackDoorId&&!order.entryDoorId&&!a.squeeze&&
  !a.traversal&&!a.traversalPending&&!a.doorTraversal&&
  !a.fireRetreatTarget&&distance(order.p,goal)<.5;
};
const observed=new Set([
 'full-body-lane','blocked-leg-connector','cold-micro-departure',
 'lane-cycle-world'
]);
/** Only actually ADOPTED, source-tagged route proposals count. Repeated
 * visits within 12 world units, with <12 units of net GO improvement,
 * across >=2 seconds are evidence; short corner corrections alone are not.
 * Route source changes do not reset this witness.
 */
export function observeD328EntryRoute(a:TeamActor,source:string,
 first:Pt|undefined,seconds:number):void{
 const order=a.plan[0],goal=order?.p;
 if(!goal||!first||!observed.has(source)||!qualifying(a,goal))return;
 const prior=witnesses.get(a);
 const remaining=distance(a.p,goal);
 const same=prior&&prior.orderId===order.id&&
  distance(prior.goal,goal)<.5&&
  distance(prior.anchor,a.p)<12&&distance(prior.first,first)<20&&
  seconds-prior.lastAt<5&&seconds-prior.firstAt<13&&
  remaining>=prior.bestRemaining-12;
 if(!same){
  witnesses.set(a,{orderId:order.id,goal:clone(goal),anchor:clone(a.p),
   first:clone(first),firstAt:seconds,lastAt:seconds,count:1,
   bestRemaining:remaining,
   attempts:prior?.orderId===order.id?prior.attempts:0,
   lastAttempt:prior?.orderId===order.id?prior.lastAttempt:-Infinity});
  return;
 }
 // One additional event counts only if a real interval elapsed.
 if(seconds-prior.lastAt>=.45)prior.count=Math.min(12,prior.count+1);
 prior.lastAt=seconds;
 prior.bestRemaining=Math.min(prior.bestRemaining,remaining);
}
/** A cold, capped SELECTOR entitlement, not any form of passage authority.
 * Every proposed route must be physically revalidated by the caller.
 */
export function claimD328EntryLoopProbe(
 a:TeamActor,goal:Pt,first:Pt,seconds:number
):boolean{
 if(!qualifying(a,goal)||!Number.isFinite(seconds))return false;
 const w=witnesses.get(a);
 if(!w||w.orderId!==a.plan[0]?.id||
   distance(w.goal,goal)>.5||distance(w.anchor,a.p)>=12||
   distance(w.first,first)>=20||w.count<4||
   seconds-w.firstAt<2||seconds-w.lastAt>3||
   distance(a.p,goal)<18||w.attempts>=2||
   seconds-w.lastAttempt<5||!Number.isFinite(goal.x)||
   !Number.isFinite(goal.y))return false;
 w.attempts++;w.lastAttempt=seconds;
 return true;
}
/** Do not spend a recovery merely on the same first excursion or a route
 * ending at an altered target. Empty/invalid proposals leave gameplay alone.
 */
export function d328DistinctFullBodyAlternative(
 from:Pt,goal:Pt,cyclicFirst:Pt,route:readonly Pt[],
 sweep:(a:Pt,b:Pt)=>boolean
):Pt[]{
 if(!route.length||distance(route[0],cyclicFirst)<6||
    distance(route[route.length-1],goal)>.25)return [];
 let at=from,travel=0;
 for(const p of route){
  const leg=distance(at,p);
  if(!Number.isFinite(leg)||!sweep(at,p))return [];
  travel+=leg;at=p;
 }
 if(travel>distance(from,goal)*3+150)return [];
 return route.map(clone);
}
