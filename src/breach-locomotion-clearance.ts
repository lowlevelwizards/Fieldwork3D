import type {SessionWorldGeometry} from './breach-world-context.ts';
/** Conservative early locomotion clearance recovery.
 * Only exits a prior wall/furniture overlap through monotonic, swept motion;
 * never moves an authored waypoint or grants pass-through collision.
 */
import type {TeamActor} from './breach-game.ts';
import {WALLS,COVER,OPERATOR_RADIUS,activeWorldBounds,doorLeafSegment,pointToSegment,
 someCoverNearPoint,type Door,type Pt} from './breach-core.ts';
import {releaseStaticWallOverlap,sweptProfileClear,
 squeezeFacing,bodyClear,twoSidedSqueezePressure} from './breach-navigation.ts';
import {preciseNarrowExitWaypoint} from './breach-squeeze-leaf-exit.ts';
import {releaseEmbeddedCover} from './breach-cover-release.ts';
import {isFootstepObstacle} from './breach-traversal-surfaces.ts';
import {ownsLiveGeneratedEntryPinch,witnessedGeneratedEntryStillness}
 from './breach-generated-entry-stillness.ts';
export function releaseEmbeddedMotorActor(
 a:TeamActor,goal:Pt,doors:Door[],dt:number,
 world?:SessionWorldGeometry,now?:number):boolean{
 // M2.10: a pre-validated narrow leaf-exit stage can overlap the
 // FULL-radius wall envelope while the ACTUAL oriented squeeze body and
 // its first motor strides are completely legal. Do not destroy that
 // transient stage with an unrelated full-body overlap rescue.
 // Both a 0.026-unit startup AND a 0.3-unit motor stride must be swept
 // through real doors, walls and furniture. Ordinary collision remains
 // authoritative on the actual next tick; this grants no displacement.
 if(a.squeeze&&a.nav.length&&a.plan?.[0]?.kind==='move'&&
    preciseNarrowExitWaypoint(a,a.nav[0])){
  // At an EXACT narrow stage center the next motor tick removes that
  // waypoint before taking another stride. Full-body rescue runs FIRST.
  // Certify the next owned narrow stage, not the zero-length arrived
  // stage, or an otherwise legal escape is erased at every corner.
  const reached=a.nav[0];
  const reachedGap=Math.hypot(reached.x-a.p.x,reached.y-a.p.y);
  const next=reachedGap<=.18&&a.nav[1]&&
    preciseNarrowExitWaypoint(a,a.nav[1])?a.nav[1]:reached;
  const dx=next.x-a.p.x,dy=next.y-a.p.y;
  const length=Math.hypot(dx,dy);
  if(length>.026){
   const heading=squeezeFacing(Math.atan2(dy,dx));
   const at=(step:number)=>({x:a.p.x+dx*step/length,
      y:a.p.y+dy*step/length});
   // A close wall may overlap the stationary full-radius (or even the
   // initially rotated shoulder). Require the REAL first two swept
   // motor strides to be legal instead of rejecting an otherwise safe
   // outward step merely because its starting center is too close.
   if(sweptProfileClear(a.p,at(Math.min(.026,length)),doors,
       heading,'squeeze',world)&&
      sweptProfileClear(a.p,at(Math.min(.3,length)),doors,
       heading,'squeeze',world))return false;
  }
 }
 // D3.33: a physically authorized, bounded generated-entry narrow
 // departure must not be undone by this EARLIER, ordinary full-radius
 // cover depenetration stage on the next 60Hz frame. This mirrors the
 // existing precise narrow waypoint ownership guard above: we only
 // defer the fallback when a currently active (same GO/order/door),
 // unexpired <=6-step pinch episode exists and BOTH the 0.026-unit
 // startup and 0.3-unit next torso sweeps fit real world geometry.
 // If the real leaf, next stride, or ownership changes, restore the
 // original full-radius cover/wall recovery immediately. No movement
 // and no clearance exemption are granted by this guard.
 const entry=a.plan[0];
 // D3.33 P13: the generic embedded-cover recovery runs BEFORE
 // prepareMotorRoute in the ONE authoritative actor motor. At the exact
 // Townhouse FRONT, it consumed 2,161 frames while Rook's position
 // returned to the same blocked point, starving the physically certified
 // generated-entry narrow exit forever.
 //
 // Give the original route motor FIRST CHOICE only when the real, stable
 // open leaf and ACTUAL 1.25s body stillness are witnessed and a genuine
 // three-sample 0.75-unit narrow stride is itself collision-legal.
 // No translation here: the route motor revalidates teammate gaps,
 // current authored order/door and full swept collision before moving.
 // If any of these checks fail, the old full-radius cover escape retains
 // every original physical authority and its early-return behavior.
 if(now!==undefined&&a.side==='blue'&&!a.nav.length&&
    entry?.kind==='move'&&entry.entryDoorId&&
    a.doorTraversal?.doorId===entry.entryDoorId&&
    a.doorTraversal.authoredOrderId===entry.id&&
    a.doorTraversal.maneuver==='grab-and-hold'&&
    !a.traversal&&!a.traversalPending&&
    witnessedGeneratedEntryStillness(a,entry.entryDoorId,now)){
  const leaf=doors.find(door=>door.id===entry.entryDoorId&&
    door.open&&!door.locked&&!door.jammed&&!door.wedged&&
    !door.heldBy&&(door.openFraction??0)>=.95&&
    Math.abs(door.angularVelocity??0)<.16&&
    pointToSegment(a.p,doorLeafSegment(door))<OPERATOR_RADIUS+20);
  if(leaf&&!bodyClear(a.p,doors,OPERATOR_RADIUS,world)){
   const dx=goal.x-a.p.x,dy=goal.y-a.p.y;
   const span=Math.hypot(dx,dy);
   if(span>.75){
    const theta=Math.atan2(dy,dx);
    const step=Math.min(.75,dt*45);
    const at={x:a.p.x+Math.cos(theta)*step,
     y:a.p.y+Math.sin(theta)*step};
    if(twoSidedSqueezePressure(a.p,at,doors,world)&&
       sweptProfileClear(a.p,at,doors,squeezeFacing(theta),
        'squeeze',world))
     return false;
   }
  }
 }
 if(now!==undefined&&a.squeeze&&!a.nav.length&&
    entry?.kind==='move'&&entry.entryDoorId&&
    ownsLiveGeneratedEntryPinch(a,entry.entryDoorId,now)){
  const door=doors.find(d=>d.id===entry.entryDoorId&&
    d.open&&!d.locked&&!d.jammed&&!d.wedged&&!d.heldBy&&
    (d.openFraction??0)>=.95&&
    Math.abs(d.angularVelocity??0)<.16&&
    pointToSegment(a.p,doorLeafSegment(d))<OPERATOR_RADIUS+20);
  if(door){
   const dx=goal.x-a.p.x,dy=goal.y-a.p.y;
   const length=Math.hypot(dx,dy);
   if(length>.3){
    const heading=squeezeFacing(Math.atan2(dy,dx));
    const at=(step:number)=>({x:a.p.x+dx*step/length,
     y:a.p.y+dy*step/length});
    if(sweptProfileClear(a.p,at(.026),doors,heading,'squeeze',world)&&
       sweptProfileClear(a.p,at(.3),doors,heading,'squeeze',world))
      return false;
   }
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
