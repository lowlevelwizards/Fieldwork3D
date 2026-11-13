import {sessionWorldGeometry} from './breach-world-context.ts';
/** Stage 7: authoritative body-collision response and recovery.
 * A full-radius swept motion is preferred; squeeze is only a physical
 * narrow passage, never a generalized avoidance bypass.
 */
import {OPERATOR_RADIUS,pointToSegment,doorLeafSegment,type Pt}
 from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {angleDifference} from './breach-plan.ts';
import {entryClearanceForLook} from './breach-entry-coordination.ts';
import {beginAutoSidestep,autoSidestepFacing,watchClearanceAllowed} from './breach-auto-sidestep.ts';
import {friendlyPassingStep} from './breach-friendly-traffic.ts';
import {pressDoorOnBodyAttempt} from './breach-door.ts';
import {tryRehearsedDoorManeuver,ownsDoorManeuverRoute,
 recordDoorManeuverContact}
 from './breach-door-traversal-maneuver.ts';
import {sessionDoorPressurePolicy}
 from './breach-door-pressure-frame.ts';
import {beginDoorGrip} from './breach-door-grip.ts';
import {approachingNarrowThreshold} from './breach-passage.ts';
import {bodyClear,sweptBodyClear,squeezeFacing,squeezeExitClear,
 twoSidedSqueezePressure,sweptProfileClear,escapeOpenDoorOverlap,
 slideAroundStaticCorner,glideAlongStaticWall} from './breach-navigation.ts';
import {recoverNormalLane,routeWithSqueezeWorld,routeWithSqueezeIntel}
 from './breach-squeeze-route.ts';
import {diagnoseMovement,blockedStepCause} from './breach-nav-diagnostics.ts';
import {recoveryAction,routeRetrySeconds,materiallyDifferentRoute} from './breach-movement-recovery.ts';
import {localDetour} from './breach-cooperation.ts';
import {discoverContactCover} from './breach-intel.ts';
import {tryAutoClearClutter} from './breach-motor-clutter.ts';
import {d,clone,angle,clamp,type ActorMotorHooks} from './breach-motor-contract.ts';
import {shouldEnterSqueeze} from './breach-squeeze-gate.ts';
import {beginMotorCpuMeasurement,finishMotorCpuMeasurement}
 from './breach-motor-cpu-probe.ts';

export function resolveMotorCollision(
 a:TeamActor,p:Pt,next:Pt,move:Pt,dt:number,s:Session,
 canAutoSidestep:boolean,closed:boolean,hooks:ActorMotorHooks,
 profile?:((section:string,elapsedMs:number)=>void)):boolean{
 const world=sessionWorldGeometry(s);
  // Allies may brush and pass one another: their bodies never hard-block
  // authored routes. Only an opposing actor is a physical traffic barrier.
  const blocking=s.operators.find(b=>b!==a&&b.health>0&&
    b.side!==a.side&&d(b.p,move)<11);
  const friendlyPositions=s.operators.filter(b=>b!==a&&b.health>0&&
    b.side===a.side).map(b=>b.p);
  // Teammates are soft traffic, not rigid obstacles: preserve movement when
  // there is no safe sidestep, and never force the stationary teammate away.
  // Passage reservations supply queue spacing near narrow doors.
  // Additional friendly steering here can put the last soldier against a
  // jamb, causing false progress and a costly squeeze into the opening.
  const desiredMove=approachingNarrowThreshold(a.p,p,s.doors)?move:
    friendlyPassingStep(a.p,move,next,friendlyPositions,
      (from,to)=>a.squeeze?sweptProfileClear(from,to,s.doors,
        a.squeezeYaw,'squeeze',world):sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world));
  // Resolve the physical body's intended step against the actual leaf
  // BEFORE evaluating movement clearance. The hinge may yield right now;
  // when it cannot (wall/actor), existing collision and recovery remain.
  const doorContact=pressDoorOnBodyAttempt(a.p,desiredMove,s.doors,dt,
    s.operators.filter(o=>o.health>0).map(o=>o.p),
    sessionDoorPressurePolicy(s,a),world);
  recordDoorManeuverContact(a,doorContact);
  // Existing handle reach animation shows a genuine, short support-hand
  // assist, never an invented door manipulation across the room.
  if(doorContact?.handAssist){
    const contacted=s.doors.find(door=>door.id===doorContact.doorId);
    if(contacted&&beginDoorGrip(a,contacted,s.seconds)){
      a.lastDoorAt=s.seconds;a.lastDoorId=contacted.id;
      a.lastDoorMethod='open';
    }else if(s.seconds-a.lastDoorAt>.76){
      a.lastDoorAt=s.seconds;a.lastDoorId=doorContact.doorId;
      a.lastDoorMethod='open';
    }
  }
  // The physical transition requires a valid oriented three-point torso
  // sweep; normal clearance remains the preference whenever it fits.
  const normalClear=sweptBodyClear(a.p,desiredMove,s.doors,OPERATOR_RADIUS,world);
  const travelHeading=angle(a.p,desiredMove);
  const sidewaysYaw=squeezeFacing(travelHeading);
  // Ordinary full-body steps cannot request a squeeze. Skip three oriented
  // profile sweeps unless normal clearance failed or a squeeze is active.
  // This is exactly equivalent for gate/traversal decisions, but avoids
  // unnecessary door and world-geometry queries on the common walk path.
  const narrowClear=(!normalClear||a.squeeze)&&
    sweptProfileClear(a.p,desiredMove,s.doors,sidewaysYaw,'squeeze',world);
  // An incidental near-miss with a prop or wall is NOT an order to
  // rotate the entire body into a squeeze. First look for a genuine
  // full-shoulder route around it (often just a short sidestep). This is
  // transient motor navigation; the player-authored waypoint stays put.
  // Rate-limit this *physical-world* search to avoid A* churn every tick.
  if(!normalClear&&!blocking&&!closed&&!a.traversalPending&&
     s.seconds-a.lastNormalLaneProbeAt>.50){
    // Failed comfort searches must not restart the world-truth recovery
    // clock; it needs uninterrupted stall time to escalate blocked moves.
    a.lastNormalLaneProbeAt=s.seconds;
    // A real, remembered doorway owns its repeatable local footwork.
    // Only a meaningful collision can select a bounded full-body maneuver;
    // no per-tick 30-candidate search or surprise authored route edits.
    if(a.doorTraversal&&tryRehearsedDoorManeuver(
       a,s,next,canAutoSidestep))return true;
    // The routine is still being physically executed. Do not let generic
    // route recovery repeatedly discard its chosen shoulder-clear path.
    if(ownsDoorManeuverRoute(a)&&
       s.seconds-a.doorTraversal!.lastProgressAt<1.8)return true;
    const laneAt=profile?beginMotorCpuMeasurement():0;
    const fullLane=recoverNormalLane(a.p,p,s.doors,world);
    if(profile)profile('motor-collision-lane',finishMotorCpuMeasurement(laneAt));
    if(fullLane.length&&d(fullLane[0],next)>6&&
       d(fullLane[0],a.p)>3&&
       watchClearanceAllowed(a.p,fullLane[0],p,
         !!a.aimInstruction&&a.aimInstruction.mode!=='free',
         (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world))&&
       sweptBodyClear(a.p,fullLane[0],s.doors,OPERATOR_RADIUS,world)){
      const side=beginAutoSidestep(a.p,next,fullLane[0],a.heading,p,
        s.seconds,canAutoSidestep);
      if(side)a.autoSidestep=side;
      a.nav=fullLane;a.retryRouteAt=0;a.recoveryAttempts=0;
      // Preserve existing WATCH facing and weapon intention; only the
      // feet choose a different line around the obstruction.
      a.squeeze=false;a.squeezeTime=0;
      return true;
    }
  }
  // A grazing wall is not a narrow corridor. Glide the legal tangential
  // component at the full body radius, even when the proposed step points
  // slightly INTO the wall. Avoid rotating into a squeeze facing while
  // simply walking parallel to a solid wall or reversing alongside it.
  if(!normalClear&&!blocking&&!closed){
    const glideAt=profile?beginMotorCpuMeasurement():0;
    const glide=glideAlongStaticWall(a.p,desiredMove,s.doors,world);
    if(profile)profile('motor-collision-glide',finishMotorCpuMeasurement(glideAt));
    if(glide){
      const old=clone(a.p);
      a.priorP=old;a.p=glide;
      // Footwork and motion cues follow resolved, not rejected movement.
      a.velocity=d(old,glide)/Math.max(dt,.0001);
      // A legal sideways wall glide moves the feet, not necessarily the
      // entire upper body. Never grant passage without the existing sweep.
      const side=beginAutoSidestep(old,next,glide,a.heading,p,
        s.seconds,canAutoSidestep);
      if(side)a.autoSidestep=side;
      const heldSide=autoSidestepFacing(a.autoSidestep,old,glide,p,
        s.seconds,canAutoSidestep);
      // Ordinary wall-gliding faces the actual slide, not the obstructed
      // grid waypoint. A generated squad entry that has already achieved
      // full shoulder clearance is different: its authored clearing sector
      // should keep rotating while the circular full-body sweep glides.
      // Do not relax geometry, squeeze turning, or explicit WATCH priority.
      const entry=a.plan[0];
      const clearedEntryLook=!a.squeeze&&entry?.kind==='move'&&
        !!entry.entryDoorId&&entry.aimMode==='fixed'&&
        entry.facing!==undefined&&
        entryClearanceForLook(
          s.doors.find(door=>door.id===entry.entryDoorId),
          glide,entry.p);
      // Both TRACK and authored FIXED gaze take precedence over the
      // physical glide. Only feet move until the normal aim tick rotates.
      if(!a.aimInstruction&&!clearedEntryLook&&heldSide===null)
        a.heading=angle(old,glide);
      a.blockedTime=0;a.lastBlocker='clear';a.retryRouteAt=0;
      a.recoveryAttempts=0;
      if(a.squeeze&&bodyClear(a.p,s.doors,OPERATOR_RADIUS,world)){
        a.squeeze=false;a.squeezeTime=0;
      }
      return true;
    }
  }
  // Leave a moving leaf to its physical hinge. A passing door can make
  // narrow-profile collision look legal for a frame even though ordinary
  // shoulder travel will become available as the panel finishes opening.
  const possibleSqueeze=!normalClear&&narrowClear&&!a.squeeze;
  const nearNarrow=possibleSqueeze&&
    approachingNarrowThreshold(a.p,p,s.doors);
  const leafMoving=possibleSqueeze&&s.doors.some(door=>
    door.open&&!door.wedged&&!door.heldBy&&
    Math.abs(door.angularVelocity??0)>.08&&
    pointToSegment(desiredMove,doorLeafSegment(door))<OPERATOR_RADIUS+12);
  if(shouldEnterSqueeze({
    fullBodyClear:normalClear,narrowBodyClear:narrowClear,
    alreadySqueezing:a.squeeze,closedDoor:closed,
    doorAdvancing:!!doorContact?.advanced,leafMoving,
    traversalPending:!!a.traversalPending,
    nearNarrowThreshold:nearNarrow,
    opposingPressure:possibleSqueeze&&!nearNarrow&&
      !leafMoving&&!closed&&
      twoSidedSqueezePressure(a.p,desiredMove,s.doors,world)
  })){
    a.squeeze=true;a.squeezeYaw=sidewaysYaw;a.squeezeTime=0;
    a.velocity=0;
    // Alignment is a real, short stationary transition, not a teleport.
    return true;
  }
  if(a.squeeze){
    a.squeezeYaw=sidewaysYaw;
    if(normalClear&&squeezeExitClear(a.p,desiredMove,s.doors,12,world)){
      a.squeeze=false;a.squeezeTime=0;
    }else{
      // The body visibly turns to the SAME angle used by oriented collision
      // before we permit movement. Otherwise traversal is visually false.
      const remaining=angleDifference(a.heading,a.squeezeYaw);
      a.heading+=clamp(remaining,-dt*5,dt*5);
      a.turning=Math.abs(remaining);
      if(Math.abs(remaining)>.12){a.velocity=0;return true;}
      a.squeezeTime+=dt;
      if(a.squeezeTime<.18){a.velocity=0;return true;}
    }
  }
  const traversable=a.squeeze?narrowClear:normalClear;
  if(!traversable&&!blocking&&
     tryAutoClearClutter(s,a,desiredMove,hooks))return true;
  if(!traversable&&!blocking){
    const escape=escapeOpenDoorOverlap(a.p,p,s.doors,dt*45,world);
    if(escape){
      a.priorP=clone(a.p);a.p=escape;a.velocity=0;
      a.blockedTime=0;a.lastBlocker='door';
      // The current route is still authored and remains active. Replan
      // its transient motor path only after physically leaving the leaf.
      a.nav=[];a.retryRouteAt=0;return true;
    }
  }
  // Furniture corners should be brushed around, not treated as hard jams.
  // Every candidate remains a real swept, full-size body movement.
  if(!traversable&&!a.squeeze&&!blocking&&!closed&&
     diagnoseMovement(a.p,desiredMove,s.doors,[],8,world).blocker==='furniture'){
    const slide=slideAroundStaticCorner(a.p,desiredMove,next,s.doors,world);
    if(slide){
      const old=clone(a.p);
      const side=beginAutoSidestep(old,next,slide,a.heading,p,
        s.seconds,canAutoSidestep);
      if(side)a.autoSidestep=side;
      a.priorP=old;a.p=slide;
      a.velocity=d(old,slide)/Math.max(dt,.0001);
      a.blockedTime=0;a.lastBlocker='clear';a.retryRouteAt=0;
      return true;
    }
  }
  // Try nearby route repair for actor jams, furniture, and door leaves.
  if((!traversable||blocking)&&!ownsDoorManeuverRoute(a)&&
    recoveryAction(blocking?'actor':a.lastBlocker,a.blockedTime,
      s.seconds-a.lastNavRepairAt,a.recoveryAttempts)==='detour'){
    const candidate=localDetour(a.p,next,s.doors,s.operators
      .filter(o=>o!==a&&o.health>0).map(o=>o.p),8,world);
    if(candidate&&d(candidate,p)<d(a.p,p)+12&&
      watchClearanceAllowed(a.p,candidate,p,
        !!a.aimInstruction&&a.aimInstruction.mode!=='free',
        (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world))&&
      (!a.nav.length||d(candidate,a.nav[0])>12)){
      const side=beginAutoSidestep(a.p,next,candidate,a.heading,p,
        s.seconds,canAutoSidestep);
      if(side)a.autoSidestep=side;
      a.nav.unshift(candidate);a.lastNavRepairAt=s.seconds;
      return true;
    }
  }
  if(!closed&&!blocking&&traversable){
    a.priorP=clone(a.p);a.p=desiredMove;a.blockedTime=0;
    a.recoveryAttempts=0;a.retryRouteAt=0;
    a.lastBlocker='clear';
    if(a.side==='blue'&&s.seconds-s.movementNoiseAt>.54){
      hooks.hear(s,a.p,a.posture==='crouch'?30:68,'footstep');
      s.movementNoiseAt=s.seconds;
    }
  }else{
    // A genuinely swinging leaf is actively clearing the path. Preserve
    // the authored route; don't misdiagnose pressure as a stuck waypoint
    // or start detour/replan churn while the door is actually yielding.
    if(!blocking&&!closed&&doorContact?.advanced){
      a.velocity=0;a.blockedTime=0;a.lastBlocker='door';
      return true;
    }
    a.velocity=Math.max(0,a.velocity-dt*130);
    a.blockedTime+=dt;
    a.lastBlocker=blockedStepCause(
      diagnoseMovement(a.p,desiredMove,s.doors,
        s.operators.filter(b=>b!==a&&b.side!==a.side&&b.health>0)
        .map(b=>b.p),8,world).blocker,!!blocking,closed);
    if(a.side==='blue'&&a.lastBlocker==='furniture'){
      const newlyKnown=discoverContactCover(s.intel,a.p,13);
      if(newlyKnown.length){
        a.lastNavRepairAt=-10;
        hooks.notify(s,a.name+' DISCOVERED OBSTRUCTION');
      }
    }
    if(a.blockedTime>1&&a.blockedTime<1.1)
      hooks.notify(s,a.name+' BLOCKED · '+a.lastBlocker.toUpperCase());
    // Observe actual hinge velocity and local leaf contact; waiting for an
    // advancing panel is not a failed route, but a stalled panel still
    // escalates through ordinary replan/report after the bounded grace.
    const doorMoving=a.lastBlocker==='door'&&s.doors.some(door=>
      door.open&&!door.wedged&&!door.heldBy&&
      Math.abs(door.angularVelocity??0)>.08&&
      pointToSegment(desiredMove,doorLeafSegment(door))<OPERATOR_RADIUS+12);
    const repair=recoveryAction(a.lastBlocker,a.blockedTime,
      s.seconds-a.lastNavRepairAt,a.recoveryAttempts,{doorMoving});
    if((repair==='replan'||repair==='report')&&s.seconds>=a.retryRouteAt&&
       !ownsDoorManeuverRoute(a)){
      a.lastNavRepairAt=s.seconds;
      // Once actual collision is observed, repair against real geometry,
      // not only the incomplete player-intel route that may run through
      // an undiscovered door frame. The authored final goal is unchanged.
      const replanAt=profile?beginMotorCpuMeasurement():0;
      const repaired=a.side==='red'?hooks.cachedEnemyRoute(s,a.p,p,true):
        routeWithSqueezeWorld(a.p,p,s.doors,world);
      if(profile)profile('motor-collision-replan',finishMotorCpuMeasurement(replanAt));
      // A world-truth path that repeats the stuck steps is not progress.
      // Known-intel fallback is allowed only if it materially differs;
      // never replace a route with an empty result while the door moves.
      let adopted=false;
      if(materiallyDifferentRoute(a.nav,repaired)){
        a.nav=repaired;adopted=true;
      }else if(a.side==='blue'){
        const known=routeWithSqueezeIntel(s.intel,a.p,p);
        if(materiallyDifferentRoute(a.nav,known)){
          a.nav=known;adopted=true;
        }
      }
      if(adopted){
        a.retryRouteAt=0;a.recoveryAttempts=0;
      }else{
        a.recoveryAttempts++;
        a.retryRouteAt=s.seconds+routeRetrySeconds(a.recoveryAttempts);
        if(repair==='report'&&a.side==='blue')
          hooks.notify(s,a.name+' NO SAFE ROUTE · ORDERS RETAINED');
      }
    }
    // Do not discard an authored plan just because someone is in the way.
  }
  return true;
}
