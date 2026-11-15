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
 from:Pt,stage:readonly Pt[],goal:Pt,continuation:readonly Pt[],
 canSweep:(a:Pt,b:Pt)=>boolean
):Pt[]{
 if(!stage.length)return [];
 const end=stage[stage.length-1];
 if(distance(end,goal)>3&&(!continuation.length||
    distance(continuation[continuation.length-1],goal)>3))return [];
 // A physical portal probe is a LOCAL correction, not a license to
 // replace a large-map route with a long speculative course. Reject
 // excessive detours, even when every waypoint is individually legal.
 // Existing motor recovery remains fully eligible after rejection.
 const route=distance(end,goal)<=3?stage:[...stage,...continuation];
 let length=0,at=from;
 for(const next of route){length+=distance(at,next);at=next;}
 if(length>distance(from,goal)*1.35+24)return [];
 // Do not re-enter the real hinged leaf at the stage/route handoff.
 if(distance(end,goal)>3&&distance(end,continuation[0])>1&&
    !canSweep(end,continuation[0]))return [];
 return route.map(clone);
}
