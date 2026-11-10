/** Roadmap 2 / Stage 12 — session-owned authoritative geometry.
 * Live collision, route and ballistic geometry are keyed by Session, not by
 * whichever mission the renderer or a map audit activated last.
 *
 * Compatibility: breach-core's active WALLS/COVER remain only for legacy,
 * presentation and offline single-site callers during migration. This module
 * never activates a global site, swaps arrays or advances a simulation tick.
 */
import type {Session} from './breach-game.ts';
import {
 W,H,WALLS,activeGeometryRevision,pointToSegment,segmentsCross,
 doorBlocksRay,route,OPERATOR_RADIUS,type Pt,type Segment,type Obstacle,
 type Door
} from './breach-core.ts';
import {TacticalGeometryIndex,pointBounds,rayBounds} from './breach-spatial-index.ts';
import {isFootstepObstacle} from './breach-traversal-surfaces.ts';
import type {Site,WorldBounds} from './breach-site.ts';

export type SessionWorldGeometry={
 readonly site:Site|null;
 /** Geometry snapshots do not change when another site is activated. */
 readonly walls:readonly Segment[];
 /** Exactly the mission's mutable, breakable furniture / cover inventory. */
 readonly cover:readonly Obstacle[];
 readonly bounds:WorldBounds;
 readonly initializedAtRevision:number;
 /** Changes only for this mission; ignores global activation and other games. */
 readonly revision:number;
 /** Mark a frame seek/restore that changes cover without a new physical tick. */
 invalidate():void;
 passable(point:Pt,clearance?:number):boolean;
 route(from:Pt,to:Pt,canStand?:(point:Pt)=>boolean):Pt[];
 someWallNearPoint(point:Pt,radius:number,
  matches:(wall:Segment,index:number)=>boolean):boolean;
 someCoverNearPoint(point:Pt,radius:number,
  matches:(cover:Obstacle,index:number)=>boolean):boolean;
 someCoverAlongRay(from:Pt,to:Pt,
  matches:(cover:Obstacle,index:number)=>boolean):boolean;
 staticWallBlocksRay(ray:Segment):boolean;
 isClear(from:Pt,to:Pt,doors:readonly Door[],ignoreDoors?:boolean):boolean;
};
const contexts=new WeakMap<Session,SessionWorldGeometry>();
const defaultBounds:WorldBounds={minX:0,minY:0,maxX:W,maxY:H};
const pointInCover=(p:Pt,o:Obstacle,r=0)=>
 Math.abs(p.x-o.x)<o.w/2+r&&Math.abs(p.y-o.y)<o.h/2+r;
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);

/** A private per-session spatial index follows physical cover revision.
 * Distinct sessions cannot invalidate or overwrite one another's buckets.
 * In-place mutations must increment s.objectRevision, just as they do for
 * existing tactical persistence and live-visibility caches.
 */
export function registerSessionWorldGeometry(s:Session):SessionWorldGeometry{
 const existing=contexts.get(s);if(existing)return existing;
 const site=s.site??null;
 const walls=(site?.walls??WALLS).map(w=>({
  a:{...w.a},b:{...w.b}
 }));
 const cover=s.coverState;
 const bounds=site?.bounds??defaultBounds;
 let epoch=0;
 let invalidated=false;
 let lastRevision=s.objectRevision;
 let lastLength=cover.length;
 let index=new TacticalGeometryIndex(walls,cover);
 const indexed=()=>{
  if(invalidated||lastRevision!==s.objectRevision||lastLength!==cover.length){
   invalidated=false;
   index=new TacticalGeometryIndex(walls,cover);
   lastRevision=s.objectRevision;lastLength=cover.length;epoch++;
  }
  return index;
 };
 const context:SessionWorldGeometry={
  get site(){return s.site??null;},walls,cover,bounds,
  initializedAtRevision:activeGeometryRevision(),
  invalidate(){invalidated=true;},
  get revision(){indexed();return epoch;},
  someWallNearPoint(p,r,matches){
   return indexed().someWall(pointBounds(p,r),matches);
  },
  someCoverNearPoint(p,r,matches){
   return indexed().someCover(pointBounds(p,r),matches);
  },
  someCoverAlongRay(from,to,matches){
   return indexed().someCover(rayBounds(from,to),matches);
  },
  staticWallBlocksRay(ray){
   return indexed().someWall(rayBounds(ray.a,ray.b),
    wall=>segmentsCross(ray,wall));
  },
  passable(p,clearance=OPERATOR_RADIUS){
   if(p.x<bounds.minX+13||p.y<bounds.minY+20||
      p.x>bounds.maxX-13||p.y>bounds.maxY-13)return false;
   if(context.someWallNearPoint(p,clearance+1,
     wall=>pointToSegment(p,wall)<clearance+1))return false;
   if(context.someCoverNearPoint(p,clearance,
     obstacle=>isFootstepObstacle(obstacle)&&
       pointInCover(p,obstacle,clearance)))return false;
   return true;
  },
  route(from,to,canStand){
   return route(from,to,canStand??(p=>context.passable(p)));
  },
  isClear(from,to,doors,ignoreDoors=false){
   const ray={a:from,b:to};
   if(context.staticWallBlocksRay(ray))return false;
   if(!ignoreDoors&&doorBlocksRay(doors as Door[],ray))return false;
   const n=Math.max(1,Math.ceil(distance(from,to)/8));
   for(let i=1;i<n;i++){
    const t=i/n,p={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t};
    if(cover.some(o=>!['chain-link-fence','iron-fence'].includes(o.fixture??'')&&
       pointInCover(p,o,0)))return false;
   }
   return true;
  }
 };
 contexts.set(s,context);
 return context;
}
export function sessionWorldGeometry(s:Session):SessionWorldGeometry{
 return contexts.get(s)??registerSessionWorldGeometry(s);
}
/** Small compatibility port used by already-migrated AI consumers. */
export function worldGeometryForQuery(s:Session):
 Pick<SessionWorldGeometry,'walls'|'cover'>{
 const context=sessionWorldGeometry(s);
 return {walls:context.walls,cover:context.cover};
}

/** Rewinding immutable replay frames may restore the same revision number.
 * Invalidate local broadphase without changing the recorded simulation epoch.
 */
export function invalidateSessionWorldGeometry(s:Session):void{
 sessionWorldGeometry(s).invalidate();
}

/** Legacy import compatibility, backed entirely by the presentation layer.
 * This physical world module never activates or publishes a global site.
 */
export {setPresentationWorldSession,adoptPresentationWorldSession,
 withDetachedPresentationWorld,publishSessionCoverToActiveSite}
 from './breach-presentation-world-ownership.ts';
