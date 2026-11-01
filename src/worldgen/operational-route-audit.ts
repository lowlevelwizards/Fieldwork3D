/** Report operator-scale routes to real customer and staff working faces.
 * Invoke only while the physical site is active; the caller supplies the
 * authoritative route predicate. Bounded to the first four real counters
 * to avoid expanding Map Lab generation latency on large sites.
 */
import type {Site} from '../breach-site.ts';
import type {Pt} from '../breach-core.ts';
import {inspectCounterAccess} from './service-counter-access.ts';

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
