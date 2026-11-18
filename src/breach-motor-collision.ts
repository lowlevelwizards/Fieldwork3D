import {setTransientRoute,prependTransientLeg} from './breach-route-transition.ts';
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
import {tryGoalCompleteDoorHandoffAfterEscape,
  tryRehearsedDoorManeuver,ownsDoorManeuverRoute,
 selfBlockingHingeRelief,recordDoorManeuverContact}
 from './breach-door-traversal-maneuver.ts';
import {sessionDoorPressurePolicy}
 from './breach-door-pressure-frame.ts';
import {approachingNarrowThreshold} from './breach-passage.ts';
import {bodyClear,sweptBodyClear,squeezeFacing,squeezeExitClear,
 twoSidedSqueezePressure,sweptProfileClear,escapeOpenDoorOverlap,
 slideAroundStaticCorner,glideAlongStaticWall} from './breach-navigation.ts';
import {recoverNormalLane,routeWithSqueezeWorld,routeWithSqueezeIntel,
 routeToNextOperableDoor,repairBlockedTransientWorldLeg}
 from './breach-squeeze-route.ts';
import {diagnoseMovement,blockedStepCause} from './breach-nav-diagnostics.ts';
import {recoveryAction,routeRetrySeconds,materiallyDifferentRoute,
 provisionalRouteAccepted} from './breach-movement-recovery.ts';
import {localDetour} from './breach-cooperation.ts';
import {discoverContactCover} from './breach-intel.ts';
import {tryAutoClearClutter} from './breach-motor-clutter.ts';
import {restoreAfterOpenLeafEscape} from './breach-motor-route.ts';
import {sweptRejoinExistingRoute,noteRepeatedDoorLeafEscape} from './breach-door-escape-rejoin.ts';
import {d,clone,angle,clamp,type ActorMotorHooks} from './breach-motor-contract.ts';
import {notePreciseLocalDetour} from './breach-motor-local-detour.ts';
import {shouldProbeCircularFullBodyLane,alternateFullBodyLaneFromCycle,
 shouldProbeDoorlessStackLane,alternateStackWorldRoute,
 noteCircularWorldRoute,ownsCircularWorldRoute}
 from './breach-cycle-lane-recovery.ts';
import {shouldEnterSqueeze} from './breach-squeeze-gate.ts';
import {allowPhysicalRouteReissue} from './breach-route-recurrence.ts';
import {shouldProbeStationaryCollisionRoute}
 from './breach-recovery-proposal-gate.ts';
import {claimPhysicalLeafRejoin,relevantStableOpenLeaf,
 selectPhysicalOpenLeafRejoin} from './breach-physical-leaf-rejoin.ts';
import {routeWithNormalWorld,coldFineMotorWorldRoute}
 from './breach-squeeze-route.ts';
import {claimRepeatedFurnitureDeparture,
 selectMotorVerifiedFurnitureDeparture}
 from './breach-d317c-micro-departure.ts';
import {stackMicroRecoveryEligible,claimStackMicroAttempt,selectStackMicroCorner}
 from './breach-stack-micro-corner.ts';
import {beginMotorCpuMeasurement,finishMotorCpuMeasurement}
 from './breach-motor-cpu-probe.ts';
import {selectColdMotorMicroDeparture,claimColdMotorMicroDeparture}
 from './breach-d326-micro-departure.ts';
import {claimD326ColdFineProbe,markD326FineMotorRoute}
 from './breach-d326-fine-route-gate.ts';

export function resolveMotorCollision(
 a:TeamActor,p:Pt,next:Pt,move:Pt,dt:number,s:Session,
 canAutoSidestep:boolean,closed:boolean,hooks:ActorMotorHooks,
 profile?:((section:string,elapsedMs:number)=>void),
 clearingDoorId?:string):boolean{
 const world=sessionWorldGeometry(s);
  // Allies may brush and pass one another: their bodies never hard-block
  // authored routes. Only an opposing actor is a physical traffic barrier.
  // The friendly steering routine is an exact no-op unless a teammate
  // is within its 21/25-unit gate of the proposed step. Detect that gate
  // during the existing opposing-actor scan; only then allocate the full
  // friendly roster and evaluate swept alternative steps.
  const narrowApproach=approachingNarrowThreshold(a.p,p,s.doors);
  let blocking:TeamActor|undefined,needsFriendlySteering=false;
  const steerRadius=d(a.p,next)>26?25:21;
  const steerRadiusSq=steerRadius*steerRadius;
  for(const b of s.operators){
    if(b===a||b.health<=0)continue;
    const dx=b.p.x-move.x,dy=b.p.y-move.y;
    const gapSq=dx*dx+dy*dy;
    if(b.side!==a.side){
      if(!blocking&&gapSq<121)blocking=b;
    }else if(!narrowApproach&&gapSq<steerRadiusSq)
      needsFriendlySteering=true;
  }
  // Teammates remain soft traffic. Passage reservations own narrow doors,
  // so a cosmetic sidestep must not steer the queue into the moving leaf.
  let desiredMove=move;
  if(needsFriendlySteering){
    const friendlyPositions:Pt[]=[];
    for(const b of s.operators)
      if(b!==a&&b.health>0&&b.side===a.side)
        friendlyPositions.push(b.p);
    desiredMove=friendlyPassingStep(a.p,move,next,friendlyPositions,
      (from,to)=>a.squeeze?sweptProfileClear(from,to,s.doors,
        a.squeezeYaw,'squeeze',world):sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world));
  }
  // Resolve the physical body's intended step against the actual leaf
  // BEFORE evaluating movement clearance. The hinge may yield right now;
  // when it cannot (wall/actor), existing collision and recovery remain.
  const pressurePolicy=sessionDoorPressurePolicy(s,a);
  if(clearingDoorId){
    // Opening a real partially blocked hinge must not be answered by
    // an incidental BODY CLOSE on the very next validated route step.
    // Only this leaf is protected, only for this already swept-clear
    // motor step. Explicit CLOSE, other hinges, actor collision unchanged.
    const originalDeferClosing=pressurePolicy.deferClosing;
    pressurePolicy.deferClosing=door=>door.id===clearingDoorId||
      originalDeferClosing?.(door)===true;
  }
  const doorContact=pressDoorOnBodyAttempt(a.p,desiredMove,s.doors,dt,
    ()=>s.operators.filter(o=>o.health>0).map(o=>o.p),
    pressurePolicy,world);
  recordDoorManeuverContact(a,s,doorContact);
  // Existing handle reach animation shows a genuine, short support-hand
  // assist, never an invented door manipulation across the room.
  if(doorContact?.handAssist&&!a.doorHandContact&&
     s.seconds-a.lastDoorAt>.76){
    a.lastDoorAt=s.seconds;a.lastDoorId=doorContact.doorId;
    a.lastDoorMethod='open';
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
     !ownsCircularWorldRoute(a,s.seconds)&&
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
    // D3.26C Apartment 19036595: a 23-unit grid route was marked
    // physically clear at its coarse 4-unit samples even though the
    // real first 0.3-unit stride immediately hit a wall. After actual
    // sustained blockage, try at most two COLD 2/5-unit departures.
    // Each departure and the new first world-route leg use the SAME
    // full-body 0.3-unit motor sweep; the original authored GO is kept.
    // Near an active hinge, the existing doorway maneuver remains owner.
    const moveOrder=a.plan[0];
    const episodeDoor=a.doorTraversal?.doorId?
      s.doors.find(door=>door.id===a.doorTraversal?.doorId):undefined;
    const remoteEpisode=!a.doorTraversal||!!episodeDoor&&
      pointToSegment(a.p,doorLeafSegment(episodeDoor))>OPERATOR_RADIUS+28;
    if(a.side==='blue'&&moveOrder?.kind==='move'&&
       !moveOrder.stackDoorId&&!moveOrder.entryDoorId&&
       !a.squeeze&&!a.traversal&&!a.traversalPending&&
       !a.fireRetreatTarget&&remoteEpisode&&
       a.blockedTime>=1.6&&
       (a.lastBlocker==='wall'||a.lastBlocker==='furniture')){
      const sweep=(from:Pt,to:Pt)=>
        sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world);
      // D3.26G1: cold fine-world entitlement must NOT depend on this
      // independent 2/5-unit coarse-tail experiment succeeding or even
      // retaining retry budget. Apartment 19036595 consumed two failed
      // short-stage probes before the fine recovery could run.
      if(claimColdMotorMicroDeparture(a,p,s.seconds)){
        const corrected=selectColdMotorMicroDeparture(
          a.p,p,next,sweep,
          pt=>bodyClear(pt,s.doors,OPERATOR_RADIUS,world),
          (from,to)=>routeWithSqueezeWorld(from,to,s.doors,world));
        if(corrected.length&&watchClearanceAllowed(a.p,corrected[0],p,
          !!a.aimInstruction&&a.aimInstruction.mode!=='free',sweep)){
          setTransientRoute(s,a,corrected,'motor-micro-departure');
          notePreciseLocalDetour(a,corrected[0]);
          a.lastNavRepairAt=s.seconds;
          provisionalRouteAccepted(a);
          a.squeeze=false;a.squeezeTime=0;
          return true;
        }
      }
      // D3.26F2: the D3.26D whole-route verifier rejected all coarse
      // continuations on Apartment 19036595. A COLD, 4-unit world route
      // WAS fully legal at every 0.3-unit physical stride. Only after
      // genuine wall/furniture blockage and an exhausted short departure
      // may this same ordinary MOVE use that complete certified path.
      // Door episodes nearby, ENTRY, STACK, squeeze and live traversal
      // stay on their previous motor/queue authority. This selects route
      // nodes; it NEVER moves the body or changes its authored GO.
      if(a.blockedTime>=2&&claimD326ColdFineProbe(a,p,s.seconds)){
        const fine=coldFineMotorWorldRoute(a.p,p,s.doors,world);
        if(fine.length&&watchClearanceAllowed(a.p,fine[0],p,
          !!a.aimInstruction&&a.aimInstruction.mode!=='free',sweep)){
          setTransientRoute(s,a,fine,'motor-cold-fine-world');
          markD326FineMotorRoute(a);
          notePreciseLocalDetour(a,fine[0]);
          a.lastNavRepairAt=s.seconds;
          provisionalRouteAccepted(a);
          a.squeeze=false;a.squeezeTime=0;
          return true;
        }
      }
    }
    const laneAt=profile?beginMotorCpuMeasurement():0;
    const fullLane=recoverNormalLane(a.p,p,s.doors,world);
    if(profile)profile('motor-collision-lane',finishMotorCpuMeasurement(laneAt));
    if(fullLane.length&&d(fullLane[0],next)>6&&
       d(fullLane[0],a.p)>3&&
       watchClearanceAllowed(a.p,fullLane[0],p,
         !!a.aimInstruction&&a.aimInstruction.mode!=='free',
         (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world))&&
       sweptBodyClear(a.p,fullLane[0],s.doors,OPERATOR_RADIUS,world)){
      // D3.14C2: after 3 genuine repeated departures from nearly
      // the same physical anchor with no GO progress, the same legal
      // detour can loop back forever. One bounded world-truth ALTERNATE
      // departure, on the opposite side of this local lane, must have
      // every leg fully swept and finish at the original authored GO.
      if(a.side==='blue'&&
         a.doorTraversal?.maneuver==='grab-and-hold'&&
         shouldProbeCircularFullBodyLane(a,p,
           a.doorTraversal.doorId,s.seconds)){
        const alternative=alternateFullBodyLaneFromCycle(
          a.p,p,fullLane[0],
          (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world),
          (from,to)=>routeWithSqueezeWorld(from,to,s.doors,world));
        if(alternative.length){
          setTransientRoute(s,a,alternative,'lane-cycle-world');
          noteCircularWorldRoute(a,s.seconds);
          provisionalRouteAccepted(a);
          a.squeeze=false;a.squeezeTime=0;
          return true;
        }
      }
      // D3.15B2: a real generated STACK move can cycle between the same
      // local detour and an unreachable next known waypoint before any
      // door episode exists. After THREE accepted physical local departures
      // from one anchor with no GO progress, use ONE cold world route to
      // the CURRENT STACK PlanNode. It cannot skip SYNC or the future OPEN.
      if(shouldProbeDoorlessStackLane(a,p,s.seconds)){
        const sweep=(from:Pt,to:Pt)=>
          sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world);
        const worldTail=alternateStackWorldRoute(
          a.p,p,fullLane[0],sweep,
          (from,to)=>routeWithSqueezeWorld(from,to,s.doors,world));
        if(worldTail.length){
          setTransientRoute(s,a,worldTail,'lane-cycle-world');
          noteCircularWorldRoute(a,s.seconds);
          provisionalRouteAccepted(a);
          a.squeeze=false;a.squeezeTime=0;
          return true;
        }
      }
      // D3.17B2: don't reissue a byte-for-byte equivalent side excursion
      // from a repeatedly revisited physical anchor. Keep ordinary
      // collision, glide, world recovery and original order available;
      // crucially, do not reset recoveryAttempts without actual progress.
      if(allowPhysicalRouteReissue(a,'full-body-lane',p,fullLane,s.seconds)){
        const side=beginAutoSidestep(a.p,next,fullLane[0],a.heading,p,
          s.seconds,canAutoSidestep);
        if(side)a.autoSidestep=side;
        setTransientRoute(s,a,fullLane,'full-body-lane');
        provisionalRouteAccepted(a);
        // Precise landing avoids discarding a chosen swept corner before
        // the operator physically reaches it.
        notePreciseLocalDetour(a,fullLane[0]);
        // Preserve WATCH facing and weapon intention.
        a.squeeze=false;a.squeezeTime=0;
        return true;
      }
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
    // Give an actively opening leaf the full-width crossing first. If it
    // stops for long enough, a physically clear sideways torso may pass.
    // This does not waive the swept-profile collision or queue priority.
    settledPhysicalBlockage:!!a.traversalPending&&a.blockedTime>=.65&&
      !doorContact?.advanced&&!leafMoving,
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
      // D3.13G2: an open leaf may have displaced the actual body from
      // an earlier disposable grid waypoint. Retain the original GO and
      // only drop that blocked prefix if the same full-width physical
      // sweep directly reaches a later node on the SAME route.
      // Never do A* here, cross an unswept leaf or complete an order.
      if(a.side==='blue'&&a.plan[0]?.kind==='move'&&
         s.seconds-a.lastNavRepairAt>=.7&&
         s.doors.some(door=>door.open&&
           (door.openFraction??0)>=.82&&
           pointToSegment(a.p,doorLeafSegment(door))<
             OPERATOR_RADIUS+13)){
        const rejoined=sweptRejoinExistingRoute(a.p,p,a.nav,
          (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world));
        if(rejoined.length){
          a.lastNavRepairAt=s.seconds;
          setTransientRoute(s,a,rejoined,'door-escape-swept-rejoin');
          provisionalRouteAccepted(a);
          return true;
        }
      }
      // G2B: only three repeated REAL leaf overlaps on this same
      // unchanged authored MOVE qualify for one later local world probe.
      // The original goal and disposable route stay separate.
      if(a.side==='blue')
        noteRepeatedDoorLeafEscape(a,s.seconds,p,
          a.doorTraversal?.doorId??null,a.nav);
      // The current route is still authored and remains active. Replan
      // its transient motor path only after physically leaving the leaf.
      setTransientRoute(s,a,[],'door-leaf-escape');
      if(tryGoalCompleteDoorHandoffAfterEscape(a,s,p))return true;
      if(!restoreAfterOpenLeafEscape(a,s,p))a.retryRouteAt=0;
      return true;
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
    // C1: only adopt a furniture detour with a valid next leg.
    // Motel 31149 was cycling between grid 280 and a blocked 312 waypoint;
    // these two microsteps made no goalward progress but reset blockedTime.
    // Reject the blind alley and let the existing bounded world-route
    // recovery handle it. No collision exception or extra motor authority.
    const continues=a.lastBlocker!=='furniture'||
      !candidate||sweptBodyClear(candidate,next,s.doors,OPERATOR_RADIUS,world);
    if(candidate&&continues&&d(candidate,p)<d(a.p,p)+12&&
      watchClearanceAllowed(a.p,candidate,p,
        !!a.aimInstruction&&a.aimInstruction.mode!=='free',
        (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world))&&
      (!a.nav.length||d(candidate,a.nav[0])>12)){
      const side=beginAutoSidestep(a.p,next,candidate,a.heading,p,
        s.seconds,canAutoSidestep);
      if(side)a.autoSidestep=side;
      prependTransientLeg(s,a,candidate,'local-detour');
      notePreciseLocalDetour(a,candidate);
      a.lastNavRepairAt=s.seconds;
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
    // D3.15B4: the world A* may give a coarse-swept straight leg whose
    // FIRST 0.3-unit real motor step catches a furniture corner. Do not
    // endlessly reissue that same chord. After a genuine 1.1-second
    // physical blockage on a GENERATED STACK waypoint, explore at most
    // 2 cold local micro-corner episodes. EVERY suggested sub-unit stride
    // is full-capsule swept and the original stack GO remains untouched.
    // A temporary first leg is motor-executed normally, never teleported.
    // D3.19D Garage 19089932: a coarse 10.8-unit full-body chord can
    // report clear while the next real motor-sized stride touches the
    // stable, fully open D8 leaf. Permit the EXISTING 2/4-unit micro-corner
    // only on real stationary open-leaf contact. A closed/locked/jammed or
    // advancing door retains normal physical hinge and passage authority.
    // This cold gate never moves an actor, changes STACK GO or alters
    // collision: selectStackMicroCorner must certify every 0.3-unit step.
    let stableOpenLeafContact=false;
    if(a.side==='blue'&&a.plan[0]?.kind==='move'&&
       a.plan[0].stackDoorId&&a.lastBlocker==='door'&&
       a.blockedTime>=1.1&&!closed&&!blocking){
      const leaf=relevantStableOpenLeaf(a.p,s.doors);
      stableOpenLeafContact=!!leaf&&!leaf.locked&&!leaf.jammed&&
        pointToSegment(desiredMove,doorLeafSegment(leaf))<
          OPERATOR_RADIUS+2;
    }
    if(stackMicroRecoveryEligible(a,stableOpenLeafContact)&&
       claimStackMicroAttempt(a,s.seconds)){
      const sideRoute=selectStackMicroCorner(a.p,p,
        (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world));
      if(sideRoute.length){
        setTransientRoute(s,a,sideRoute,'stack-micro-corner');
        notePreciseLocalDetour(a,sideRoute[0]);
        noteCircularWorldRoute(a,s.seconds);
        a.lastNavRepairAt=s.seconds;
        provisionalRouteAccepted(a);
        return true;
      }
    }
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
      // R2.1: when the actor ITSELF blocks a stationary partial hinge,
      // a tiny fully swept step can free the opening before a broad A*.
      // Only ordinary MOVE without an active doorway maneuver may use it.
      // Reuse the existing retry budget and the current physical motor;
      // do not move or reorient the actor here.
      if(a.side==='blue'&&a.lastBlocker==='door'&&
         a.blockedTime>=.85&&a.recoveryAttempts<4&&
         !a.doorTraversal&&!a.traversal&&!a.traversalPending&&
         a.plan[0]?.kind==='move'){
        const relief=selfBlockingHingeRelief(a,s,p);
        if(relief){
          prependTransientLeg(s,a,relief,'self-hinge-relief');
          a.recoveryAttempts++;
          a.retryRouteAt=s.seconds+routeRetrySeconds(a.recoveryAttempts);
          return true;
        }
      }
      // D3.17E3-5: an actual stationary body at a stable open leaf may
      // have a bad *transient* landing even without formal D2 ownership.
      // Try a cold full-body microstride-checked join to a later existing
      // transient node; keep the original GO and all subsequent door
      // actions. Do not fire on normal movement, active squeeze/traverse
      // or a still-swinging panel. Failed probes never alter navigation.
      if(a.side==='blue'&&a.plan[0]?.kind==='move'&&a.nav.length>=2&&
         a.blockedTime>=1.8&&
         (a.lastBlocker==='furniture'||a.lastBlocker==='door'||
          a.lastBlocker==='wall')){
        const leaf=relevantStableOpenLeaf(a.p,s.doors,
          a.doorTraversal?.doorId??null);
        if(leaf&&claimPhysicalLeafRejoin(a,leaf,p,s.seconds,
             world.revision,s.doors)){
          const physical=selectPhysicalOpenLeafRejoin(
            a.p,p,a.nav,leaf,
            (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world),
            point=>bodyClear(point,s.doors,OPERATOR_RADIUS,world),
            (from,to)=>routeWithNormalWorld(from,to,s.doors,world));
          if(physical.length&&
             watchClearanceAllowed(a.p,physical[0],p,
               !!a.aimInstruction&&a.aimInstruction.mode!=='free',
               (from,to)=>sweptBodyClear(from,to,
                 s.doors,OPERATOR_RADIUS,world))){
            setTransientRoute(s,a,physical,'open-leaf-local-rejoin');
            notePreciseLocalDetour(a,physical[0]);
            a.lastNavRepairAt=s.seconds;
            a.retryRouteAt=s.seconds+.65;
            return true;
          }
        }
      }
      // D3.17C: after THREE real, separated furniture collisions from the
      // same physical anchor and to the same blocked nav node, try a
      // bounded cold departure. Existing authored GO, queue, collision
      // and replan semantics remain unchanged if no safe route exists.
      if(a.nav.length&&claimRepeatedFurnitureDeparture(a,p,next,s.seconds)){
        const verified=selectMotorVerifiedFurnitureDeparture(
          a.p,p,a.nav,
          (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world),
          (from,to)=>routeWithSqueezeWorld(from,to,s.doors,world));
        if(verified.length&&watchClearanceAllowed(a.p,verified[0],p,
           !!a.aimInstruction&&a.aimInstruction.mode!=='free',
           (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world))){
          setTransientRoute(s,a,verified,'cold-micro-departure');
          notePreciseLocalDetour(a,verified[0]);
          // Do not erase evidence of repeated failure. This route is only
          // provisional until actual feet progress through the first step.
          a.retryRouteAt=0;
          return true;
        }
      }
      // D3.17E2: route changes are not physical progress. After repeated
      // immobile furniture contacts with unchanged door/cover geometry,
      // defer redundant world+intel A* until a cold probe is due. All
      // other physical reactions above remain active on every tick.
      if((a.lastBlocker==='furniture'||a.lastBlocker==='wall')&&
         a.blockedTime>=2.8&&
         !shouldProbeStationaryCollisionRoute(a,p,s.seconds,world.revision,
           s.doors)){
        // Deferring an expensive probe is NOT a new retry. Only count
        // route attempts actually attempted (positive deltas remain real).
        a.retryRouteAt=s.seconds+
          routeRetrySeconds(Math.max(1,a.recoveryAttempts));
        return true;
      }
      // D3.4 clinic wall witness: operator drift can make a short,
      // previously valid TRANSIENT waypoint physically unreachable from
      // today's exact position. Rejoin that same waypoint through one
      // bounded world-truth full-body connector BEFORE trying a new global
      // authored-goal path (which may lie behind several closed portals).
      // The existing collision retry already paid for this check.
      if(a.side==='blue'&&a.plan[0]?.kind==='move'&&
         (a.lastBlocker==='wall'||a.lastBlocker==='furniture')&&
         !a.doorTraversal&&!a.traversalPending&&a.nav.length){
        const connected=repairBlockedTransientWorldLeg(
          a.p,next,a.nav.slice(1),s.doors,world);
        // D3.17B3: connector waypoints are not progress if the actor
        // already walked back to the same furniture anchor repeatedly.
        // Fall through to bounded physical-world replan, without resetting
        // the normal recovery budget when an identical connector recurs.
        if(connected.length&&materiallyDifferentRoute(a.nav,connected)&&
           allowPhysicalRouteReissue(a,'blocked-leg-connector',p,
             connected,s.seconds)){
          setTransientRoute(s,a,connected,'blocked-leg-connector');
          provisionalRouteAccepted(a);
          return true;
        }
      }
      // Once actual collision is observed, repair against real geometry,
      // not only the incomplete player-intel route that may run through
      // an undiscovered door frame. The authored final goal is unchanged.
      const replanAt=profile?beginMotorCpuMeasurement():0;
      let repaired=a.side==='red'?hooks.cachedEnemyRoute(s,a.p,p,true):
        routeWithSqueezeWorld(a.p,p,s.doors,world);
      // D3.3: only a FAILED collision-truth route may request a future
      // closed-door portal. The motor owns the actual contact/open and
      // collision; this is a transient, physically swept approach prefix.
      if(!repaired.length&&a.side==='blue'&&
         a.plan[0]?.kind==='move'&&!a.doorTraversal&&!a.traversalPending)
        repaired=routeToNextOperableDoor(a.p,p,s.doors,world);
      if(profile)profile('motor-collision-replan',finishMotorCpuMeasurement(replanAt));
      // A world-truth path that repeats the stuck steps is not progress.
      // Known-intel fallback is allowed only if it materially differs;
      // never replace a route with an empty result while the door moves.
      let adopted=false;
      if(materiallyDifferentRoute(a.nav,repaired)){
        setTransientRoute(s,a,repaired,'collision-world-replan');adopted=true;
      }else if(a.side==='blue'){
        const known=routeWithSqueezeIntel(s.intel,a.p,p);
        if(materiallyDifferentRoute(a.nav,known)){
          setTransientRoute(s,a,known,'collision-intel-replan');adopted=true;
        }
      }
      if(adopted){
        provisionalRouteAccepted(a);
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
