/** Report operator-scale routes to real customer and staff working faces.
 * Invoke only while the physical site is active; the caller supplies the
 * authoritative route predicate. Bounded to the first four real counters
 * to avoid expanding Map Lab generation latency on large sites.
 */
import type {Site} from '../breach-site.ts';
import type {Pt} from '../breach-core.ts';
import {inspectCounterAccess} from './service-counter-access.ts';

/** Route-free fast path for a short straight physical approach. It uses
 * the same standing/footprint predicate as A* and samples every 4 units;
 * otherwise the caller must fall back to the authoritative pathfinder.
 */
export function straightWorkApproach(from:Pt,to:Pt,
 canStand:(p:Pt)=>boolean,maxDistance=180):boolean{
 const length=Math.hypot(to.x-from.x,to.y-from.y);
 if(length>maxDistance)return false;
 const steps=Math.max(1,Math.ceil(length/4));
 for(let i=0;i<=steps;i++){
  const t=i/steps;
  if(!canStand({x:from.x+(to.x-from.x)*t,
    y:from.y+(to.y-from.y)*t}))return false;
 }
 return true;
}
export type OperationalRouteIssue={
 fixture:string;x:number;y:number;side:'customer'|'staff';
 reason:'blocked-face'|'unreachable';
};
export function inspectOperationalRoutes(
 site:Pick<Site,'rooms'|'cover'|'doors'|'openings'>,
 reachable:(p:Pt)=>boolean,maxCounters=4):OperationalRouteIssue[]{
 const issues:OperationalRouteIssue[]=[];
 for(const counter of inspectCounterAccess(site).slice(0,Math.max(0,maxCounters))){
  for(const side of ['customer','staff'] as const){
   if(!counter[side+'Clear' as 'customerClear'|'staffClear']){
    issues.push({fixture:counter.fixture,x:counter.x,y:counter.y,
     side,reason:'blocked-face'});
   }else if(!reachable(counter[side])){
    issues.push({fixture:counter.fixture,x:counter.x,y:counter.y,
     side,reason:'unreachable'});
   }
  }
 }
 return issues;
}
