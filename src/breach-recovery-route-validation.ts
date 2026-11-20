/** D3.17E7: one cold, exact capsule microstride route verifier for
 * optional recovery proposals. It grants NO motion/collision authority.
 * Caller owns genuine door/plan eligibility; runtime motor checks again.
 */
import type {Pt} from './breach-core.ts';
import {fullBodyMotorStrideClear} from './breach-stack-micro-corner.ts';
import {materiallyDifferentRoute} from './breach-movement-recovery.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function fullBodyMotorRouteClear(from:Pt,route:readonly Pt[],
 sweep:(a:Pt,b:Pt)=>boolean,maxTravel=Infinity):boolean{
 let at=from,travel=0;
 if(!route.length)return false;
 for(const next of route){
  const d=dist(at,next);travel+=d;
  if(!Number.isFinite(d)||travel>maxTravel||
     !fullBodyMotorStrideClear(at,next,sweep))return false;
  at=next;
 }
 return true;
}
/** Cold full-body detours must at least pass the first *real* motor-size
 * stride. A coarse multi-unit sweep can miss an immediate corner contact.
 * This samples only one bounded .3-unit footstep; full fine-grid routes
 * still require fullBodyMotorRouteClear and ordinary motor resweeps all
 * subsequent physical steps.
 */
export function firstFullBodyMotorStrideClear(
 from:Pt,to:Pt,sweep:(a:Pt,b:Pt)=>boolean
):boolean{
 const length=dist(from,to);
 if(!Number.isFinite(length))return false;
 if(length<.00001)return false;
 const fraction=Math.min(.3,length)/length;
 return sweep(from,{x:from.x+(to.x-from.x)*fraction,
   y:from.y+(to.y-from.y)*fraction});
}
/** The tail is still the original authored goal, and is ALWAYS executed
 * through normal motor. Only the join prefix is geometrically certified.
 */
export function joinsExistingMotorRoute(
 from:Pt,goal:Pt,original:readonly Pt[],joinAt:number,
 prefix:readonly Pt[],sweep:(a:Pt,b:Pt)=>boolean,
 maxTravel:number
):Pt[]{
 if(!original.length||joinAt<0||joinAt>=original.length||
    dist(original[original.length-1],goal)>3||
    !prefix.length||dist(prefix[prefix.length-1],original[joinAt])>3||
    !fullBodyMotorRouteClear(from,prefix,sweep,maxTravel))return [];
 return [...prefix.map(p=>({...p})),
  ...original.slice(joinAt+1).map(p=>({...p}))];
}

/** M2: accept a cold, FULL-BODY recovery alternative only when the next
 * actual 0.3-unit motor step is clear. An actor stalled at the same old
 * first waypoint must not replace its nav solely because the far tail of
 * another path has changed. Door, squeeze, intel and generated-entry routes
 * do not use this generic full-radius helper.
 * This never advances an actor or edits a plan or world model.
 */
export function usefulFullBodyRecoveryRoute(
 from:Pt,current:readonly Pt[],candidate:readonly Pt[],
 sweep:(a:Pt,b:Pt)=>boolean,stalledSeconds:number
):boolean{
 if(!materiallyDifferentRoute(current,candidate))return false;
 const first=candidate[0];
 if(!first||!Number.isFinite(first.x)||!Number.isFinite(first.y)||
    !firstFullBodyMotorStrideClear(from,first,sweep))return false;
 // If the first waypoint has already been physically obstructed for
 // >=1.25s, changing only later waypoints cannot unstick the current leg.
 if(stalledSeconds>=1.25&&current.length&&
    dist(current[0],first)<3&&dist(from,current[0])>.5)return false;
 return true;
}
