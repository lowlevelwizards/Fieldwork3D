import type {SessionWorldGeometry} from './breach-world-context.ts';
/** Conservative early locomotion clearance recovery.
 * Only exits a prior wall/furniture overlap through monotonic, swept motion;
 * never moves an authored waypoint or grants pass-through collision.
 */
import type {TeamActor} from './breach-game.ts';
import {WALLS,COVER,OPERATOR_RADIUS,activeWorldBounds,
 someCoverNearPoint,type Door,type Pt} from './breach-core.ts';
import {releaseStaticWallOverlap,profileClear,sweptProfileClear,
 squeezeFacing} from './breach-navigation.ts';
import {preciseNarrowExitWaypoint} from './breach-squeeze-leaf-exit.ts';
import {releaseEmbeddedCover} from './breach-cover-release.ts';
import {isFootstepObstacle} from './breach-traversal-surfaces.ts';
export function releaseEmbeddedMotorActor(
 a:TeamActor,goal:Pt,doors:Door[],dt:number,
 world?:SessionWorldGeometry):boolean{
 // M2.10: a pre-validated narrow leaf-exit stage can overlap the
 // FULL-radius wall envelope while the ACTUAL oriented squeeze body and
 // its first motor strides are completely legal. Do not destroy that
 // transient stage with an unrelated full-body overlap rescue.
 // Both a 0.026-unit startup AND a 0.3-unit motor stride must be swept
 // through real doors, walls and furniture. Ordinary collision remains
 // authoritative on the actual next tick; this grants no displacement.
 if(a.squeeze&&a.nav.length&&a.plan[0]?.kind==='move'&&
    preciseNarrowExitWaypoint(a,a.nav[0])){
  const next=a.nav[0];
  const dx=next.x-a.p.x,dy=next.y-a.p.y;
  const length=Math.hypot(dx,dy);
  if(length>.026){
   const heading=squeezeFacing(Math.atan2(dy,dx));
   const at=(step:number)=>({x:a.p.x+dx*step/length,
      y:a.p.y+dy*step/length});
   if(profileClear(a.p,doors,heading,'squeeze',world)&&
      sweptProfileClear(a.p,at(Math.min(.026,length)),doors,
       heading,'squeeze',world)&&
      sweptProfileClear(a.p,at(Math.min(.3,length)),doors,
       heading,'squeeze',world))return false;
  }
 }
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
