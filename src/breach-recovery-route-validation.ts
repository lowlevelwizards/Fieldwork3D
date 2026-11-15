/** D3.17E7: one cold, exact capsule microstride route verifier for
 * optional recovery proposals. It grants NO motion/collision authority.
 * Caller owns genuine door/plan eligibility; runtime motor checks again.
 */
import type {Pt} from './breach-core.ts';
import {fullBodyMotorStrideClear} from './breach-stack-micro-corner.ts';
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
