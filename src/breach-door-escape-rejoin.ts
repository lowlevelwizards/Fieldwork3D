/** D3.13G2: after a REAL door-leaf escape, a stale disposable grid
 * prefix may steer the actor straight back into the open leaf.
 * Only shorten the existing route if its first leg is *physically blocked*
 * and a later node is directly reachable by the very same full-body sweep.
 * Preserve the original authored destination as the final node. No A*,
 * second motor, special geometry clearance or authored-order mutation.
 */
import type {Pt} from './breach-core.ts';
const gap=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function sweptRejoinExistingRoute(
 from:Pt,authoredGoal:Pt,nav:readonly Pt[],
 canSweep:(a:Pt,b:Pt)=>boolean
):Pt[]{
 if(nav.length<2||gap(nav[nav.length-1],authoredGoal)>3||
    canSweep(from,nav[0]))return [];
 // Bounded to nearby disposable legs. Never short-circuit a remote
 // door sequence, regardless of how many later intel nodes seem clear.
 for(let i=1;i<Math.min(nav.length,7);i++){
  if(gap(from,nav[i])>96||!canSweep(from,nav[i]))continue;
  return nav.slice(i).map(p=>({...p}));
 }
 return [];
}
