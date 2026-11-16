/** E1.K — read-only, allocation-free nearest eligible squad target.
 * Preserves Array.sort's stable tie preference for earlier squad members,
 * without allocating filtered/sorted arrays on each HUD or palette refresh.
 * Eligibility remains at the call site; no medical/game rules live here.
 */
import type {Pt} from '../breach-core.ts';
export function nearestEligibleActor<T extends {p:Pt}>(
 candidates:readonly T[],point:Pt,eligible:(candidate:T)=>boolean
):T|null{
 let nearest:T|null=null;
 let best=Infinity;
 for(const candidate of candidates){
  if(!eligible(candidate))continue;
  const d=Math.hypot(point.x-candidate.p.x,point.y-candidate.p.y);
  if(d<best){nearest=candidate;best=d;}
 }
 return nearest;
}
