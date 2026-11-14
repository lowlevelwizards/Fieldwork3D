/** D3.11D: separate a lawful short portal STAGE from the authored MOVE.
 * Only a route that actually reaches the original goal may replace the
 * transient path proactively after a real physical leaf-overlap escape.
 * This planner never moves an actor, changes an authored order, grants body
 * clearance, or learns geometry the player has not observed.
 */
import type {Pt} from './breach-core.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clone=(p:Pt):Pt=>({x:p.x,y:p.y});
/** Extend the rehearsed swept portal stage with a known-intel continuation.
 * The first JOIN is verified against current physical leaf/world geometry.
 * The ordinary motor will still validate every step as it actually moves.
 * An unreachable destination is not silently reclassified as a portal goal.
 */
export function completePortalRouteToAuthoredGoal(
 stage:readonly Pt[],goal:Pt,continuation:readonly Pt[],
 canSweep:(a:Pt,b:Pt)=>boolean
):Pt[]{
 if(!stage.length)return [];
 const end=stage[stage.length-1];
 if(distance(end,goal)<=3)return stage.map(clone);
 if(!continuation.length||
    distance(continuation[continuation.length-1],goal)>3)return [];
 // Disallow a step that merely reverses into the same real, solid leaf.
 const next=continuation[0];
 if(distance(end,next)>1&&!canSweep(end,next))return [];
 // Preserve the exact authored final goal even when a grid endpoint is
 // within tolerance. This is an execution hint, not a new PlanNode.
 return [...stage.map(clone),...continuation.map(clone)];
}
