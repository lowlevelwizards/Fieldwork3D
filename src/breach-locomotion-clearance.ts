import type {SessionWorldGeometry} from './breach-world-context.ts';
/** Conservative early locomotion clearance recovery.
 * Only exits a prior wall/furniture overlap through monotonic, swept motion;
 * never moves an authored waypoint or grants pass-through collision.
 */
import type {TeamActor} from './breach-game.ts';
import {WALLS,COVER,OPERATOR_RADIUS,activeWorldBounds,
 someCoverNearPoint,type Door,type Pt} from './breach-core.ts';
import {releaseStaticWallOverlap} from './breach-navigation.ts';
import {releaseEmbeddedCover} from './breach-cover-release.ts';
import {isFootstepObstacle} from './breach-traversal-surfaces.ts';
export function releaseEmbeddedMotorActor(
 a:TeamActor,goal:Pt,doors:Door[],dt:number,
 world?:SessionWorldGeometry):boolean{
 const wallRelease=releaseStaticWallOverlap(a.p,goal,doors,dt*50,world);
 if(wallRelease){
  a.priorP={...a.p};a.p=wallRelease;
  a.velocity=0;a.squeeze=false;a.squeezeTime=0;
  a.blockedTime=0;a.lastBlocker='clear';
  a.nav=[];a.retryRouteAt=0;return true;
 }
 const embeddedCover=(world?.someCoverNearPoint.bind(world)??someCoverNearPoint)(a.p,OPERATOR_RADIUS+1,o=>
  isFootstepObstacle(o)&&
  Math.abs(a.p.x-o.x)<o.w/2+OPERATOR_RADIUS&&
  Math.abs(a.p.y-o.y)<o.h/2+OPERATOR_RADIUS);
 const coverRelease=embeddedCover?
  releaseEmbeddedCover(a.p,goal,world?.cover??COVER,world?.walls??WALLS,
   doors,world?.bounds??activeWorldBounds(),dt*45):null;
 if(coverRelease){
  a.priorP={...a.p};a.p=coverRelease;
  a.velocity=0;a.squeeze=false;a.squeezeTime=0;
  a.blockedTime=0;a.lastBlocker='clear';
  a.nav=[];a.retryRouteAt=0;return true;
 }
 return false;
}
