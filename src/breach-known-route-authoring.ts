/** Known-only physical authoring routes; never use world-truth as intel.
 * Actual execution still revalidates physical collision and motor traversal. */
import type {Session} from './breach-game.ts';
import {type Pt,segmentsCross,doorBlocksSegment} from './breach-core.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {doorKnown,intelPassable} from './breach-intel.ts';
import {routeWithSqueezeIntel} from './breach-squeeze-route.ts';
import {probeObstacleCrossing,probeWindowPortalRoute,canOpenWindowForClimb,traversalRouteLength} from './breach-mantle.ts';
import {SQUEEZE_RADIUS} from './breach-navigation.ts';
import {canAutoShove} from './breach-traversal-surfaces.ts';
import {canRelocateCover} from './breach-movable-cover.ts';
import {segmentHitsBox} from './breach-ray.ts';
import {length} from './breach-plan.ts';
const d=(a:Pt,b:Pt)=>length(a,b);

/** Plan authoring can see only briefed/discovered surfaces. World-truth
 * validation runs again at execution; hidden furniture isn't exposed by
 * an unexplained path preview or a shortcut through a closed window.
 */
function knownWindowWorld(s:Session){
 const cover=s.coverState.filter((_,i)=>s.intel.cover.has(i));
 return {
  cover,walls:sessionWorldGeometry(s).walls.filter((_,i)=>s.intel.walls.has(i)),
  doors:s.doors.filter(door=>doorKnown(s.intel,door.id)),
  windows:s.windows.filter(w=>s.intel.cover.has(s.coverState.findIndex(o=>
    (o.fixture==='window-sill'||o.fixture==='glass-barrier')&&
    Math.hypot(o.x-w.x,o.y-w.y)<1))).map(w=>
      canOpenWindowForClimb(w)?{...w,open:true}:w),
  canStand:(at:Pt)=>intelPassable(at,s.intel)
 };
}
/** Preview only known, reachable window portals; never infer hidden rooms. */
export function plannedWindowRoute(s:Session,from:Pt,to:Pt,
 ordinary:readonly Pt[]=routeWithSqueezeIntel(s.intel,from,to)):Pt[]|null{
 const world=knownWindowWorld(s);
 if(!world.windows.length)return null;
 const portal=probeWindowPortalRoute(from,to,world,
   (a,b)=>routeWithSqueezeIntel(s.intel,a,b));
 if(!portal||ordinary.length&&portal.duration+.12>=
   traversalRouteLength(from,ordinary)/53)return null;
 return [...portal.approachPath,portal.crossing.landing,...portal.exitPath];
}
/** An explicit straight gesture through ONE known light object may remain
 * authored. Other blocked samples (walls, unknown cover, doors) still reject.
 * The motor must physically reach and shove the same known object later. */
function knownShoveCrossing(s:Session,from:Pt,to:Pt):number|null{
 if(!intelPassable(from,s.intel,SQUEEZE_RADIUS)||
    !intelPassable(to,s.intel,SQUEEZE_RADIUS))return null;
 const span=d(from,to);
 if(span<3)return null;
 // A shove cannot be used to disguise an ordinary known wall or a latched
 // door, even when its sample is inside the expanded furniture envelope.
 const segment={a:from,b:to};
 if(sessionWorldGeometry(s).walls.some((wall,index)=>s.intel.walls.has(index)&&
    segmentsCross(segment,wall)))return null;
 if(s.doors.some(door=>doorKnown(s.intel,door.id)&&
    doorBlocksSegment(door,segment)))return null;
 for(let index=0;index<s.coverState.length;index++){
   const obstacle=s.coverState[index];
   if(!s.intel.cover.has(index)||!canAutoShove(obstacle)||
      !canRelocateCover(obstacle)||
      !segmentHitsBox(from,to,{...obstacle,
        w:obstacle.w+2,h:obstacle.h+2}))continue;
   const allowance={...obstacle,
     w:obstacle.w+SQUEEZE_RADIUS*2+4,
     h:obstacle.h+SQUEEZE_RADIUS*2+4};
   let otherObstruction=false;
   for(let i=1,n=Math.ceil(span/4);i<n;i++){
     const t=i/n,p={x:from.x+(to.x-from.x)*t,
       y:from.y+(to.y-from.y)*t};
     if(!intelPassable(p,s.intel,SQUEEZE_RADIUS)&&
        !segmentHitsBox(p,p,allowance)){
       otherObstruction=true;break;
     }
   }
   if(!otherObstruction)return index;
 }
 return null;
}
export function knownTraversal(s:Session,from:Pt,to:Pt):boolean{
 const world=knownWindowWorld(s);
 return knownShoveCrossing(s,from,to)!==null||
   !!probeObstacleCrossing(from,to,world)||
   !!probeWindowPortalRoute(from,to,world,
     (a,b)=>routeWithSqueezeIntel(s.intel,a,b));
}
export const legalMoveRoute=(s:Session,from:Pt,to:Pt):Pt[]=>{
 const ordinary=routeWithSqueezeIntel(s.intel,from,to);
 return plannedWindowRoute(s,from,to,ordinary)??(
   ordinary.length?ordinary:knownTraversal(s,from,to)?[to]:[]);
};
