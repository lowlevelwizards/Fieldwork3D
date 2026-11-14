import {sessionWorldGeometry} from './breach-world-context.ts';
import {nearMotorDoorStroke} from './breach-motor-door-broadphase.ts';
/** Stage 7: handle physical closed leaves and intentional automatic
 * opens before body contact. Explicit authored DOOR actions retain priority.
 */
import {pointToSegment,doorLeafSegment,doorBlocksSegment,doorCenter,
 OPERATOR_RADIUS,type Pt,type Door} from './breach-core.ts';
import type {TeamActor,Session} from './breach-game.ts';
import {canAutoOpenEnRoute,autoDoorAtBodyContact,doorApproach,
 doorReachable,doorWouldStrikeActors} from './breach-door.ts';
import {doorInteraction} from './breach-interactions.ts';
import {operatorCrossingDoor} from './breach-door-pressure-arbitration.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {d,type ActorMotorHooks} from './breach-motor-contract.ts';
import {failCurrentOrder} from './breach-order-lifecycle.ts';
import {noteD32MotorDoorSelection} from './breach-d3-motor-door-witness.ts';
import {selfBlockingHingeRelief} from './breach-door-traversal-maneuver.ts';

/** D3.2.5: an opened hinge that has STOPPED well below its target may
 * no longer monopolize the actor motor. The ordinary collision/recovery
 * pipeline gets its attempt, with that same leaf protected from incidental
 * closing. This is not a collision exemption or a forced movement.
 * The hinge remains solely responsible for actual leaf rotation.
 */
export function stalledDoorYieldsToMotor(door:Door,openingSeconds:number):boolean{
 const fraction=door.openFraction??(door.open?1:0);
 return door.open&&!door.locked&&!door.heldBy&&!door.wedged&&
   fraction>=.15&&fraction<.72&&openingSeconds>=.9&&
   Math.abs(door.angularVelocity??0)<.16;
}

export function handleMotorDoor(
 a:TeamActor,p:Pt,next:Pt,move:Pt,dt:number,s:Session,
 hooks:ActorMotorHooks):{paused:boolean;closed:boolean;clearingDoorId?:string}{
  // Identify the leaf for closed-door authored handling; open hinged
  // leaves are pushed by the coupled swept-body solver below, not by
  // standing nearby or crossing a broad radius trigger.
  // Stable single pass replaces the hot-path filter and full sort.
  let closedDoor:typeof s.doors[number]|undefined;
  let closedDistance=Infinity;
  for(const door of s.doors){
    // Conservative circle/AABB rejection BEFORE trigonometric leaf
    // geometry. A contact or segment crossing cannot be outside this.
    if(!nearMotorDoorStroke(door,a.p,move,24))continue;
    const distance=pointToSegment(move,doorLeafSegment(door));
    if(distance>=24&&!doorBlocksSegment(door,{a:a.p,b:move}))
      continue;
    // Strict < preserves original array order at equal distances.
    if(distance<closedDistance){
      closedDoor=door;closedDistance=distance;
    }
  }
  // Look ahead to the route's next node, stopping to open a door before
  // the actor's capsule contacts the physical leaf.
  // Crossing a physical closed door during a move implicitly attempts to
  // open it, even if a briefed doorway missed the drawn-path insertion.
  // Deliberate DOOR actions (including KICK) retain priority and must not
  // be preempted by this convenience interaction.
  const pendingDoor=a.plan[0];
  // A route toward an authored door may cross OTHER doors. Do not let
  // the destination DOOR node disable ordinary collision-aware opening
  // of an intervening closed leaf; this was the G4d seeded deadlock.
  let doorAhead:typeof s.doors[number]|undefined;
  let closest=Infinity;
  for(const door of s.doors){
    if(!canAutoOpenEnRoute(pendingDoor,door.id,a.side==='red')||
       !nearMotorDoorStroke(door,a.p,a.p,56))continue;
    if(door.open&&(door.openFraction??0)>=.72)continue;
    if(!doorReachable(a.p,door))continue;
    if(!doorBlocksSegment(door,{a:a.p,b:next})&&
       !doorBlocksSegment(door,{a:a.p,b:p}))continue;
    const distance=pointToSegment(a.p,doorLeafSegment(door));
    if(distance<closest||
       distance===closest&&doorAhead&&door.id.localeCompare(doorAhead.id)<0){
      doorAhead=door;closest=distance;
    }
  }
  // Physical near-contact is the only fallback, not a sorted search.
  // Same physical candidate/selection order, no filtered array allocated
  // for every stride through a map full of doors. An explicit KICK/CLOSE/
  // HOLD still excludes its target while allowing intervening leaves.
  doorAhead??=autoDoorAtBodyContact(a.p,move,
    s.doors,sessionWorldGeometry(s),pendingDoor,a.side==='red');
  if(doorAhead){
    // When an earlier frame queued a short handle-side correction, let the
    // normal swept motor EXECUTE those footsteps before opening the hinge.
    // Otherwise every frame requeues the same stage while paused forever.
    const staging=a.side==='red'?a.nav[0]:undefined;
    if(staging&&d(a.p,staging)>5&&d(a.p,staging)<55&&
       doorReachable(staging,doorAhead)&&
       sweptBodyClear(a.p,staging,s.doors,8,sessionWorldGeometry(s))){
      a.motorPause=null;
      return {paused:false,closed:false};
    }
    // A cautious defender should operate a door from a real clear stance,
    // not repeatedly crowd its swing while touching the handle.
    if(a.side==='red'&&!doorAhead.open&&a.actionTimer===0&&
       doorWouldStrikeActors({...doorAhead,openFraction:0},.46,
         [a.p],OPERATOR_RADIUS+1)){
      const staged=doorApproach(a.p,doorAhead,sessionWorldGeometry(s),
        [...s.operators.filter(other=>other!==a&&other.health>0).map(other=>other.p),
         ...s.civilians.filter(c=>c.health>0).map(c=>c.p)]);
      if(staged&&d(staged,a.p)>5&&d(staged,a.p)<50&&
         sweptBodyClear(a.p,staged,s.doors,8,sessionWorldGeometry(s))){
        a.nav.unshift(staged);a.velocity=0;
        a.motorPause=null;return {paused:true,closed:false};
      }
    }
    a.motorPause='door-opening';
    noteD32MotorDoorSelection(a,doorAhead.id,s.seconds);
    const opening=doorInteraction({target:doorAhead,actorId:a.id,
      actorPosition:a.p,action:'open'});
    if(opening.reason==='held'||opening.reason==='locked'||
       opening.reason==='obstructed'){
      a.motorPause=opening.reason==='held'?'door-held':
        opening.reason==='locked'?'door-locked':'door-obstructed';
      a.lastBlocker='door';
      a.velocity=0;a.blockedTime+=dt;
      // An authored MOVE/OPEN cannot proceed through a known blocked
      // portal. Drop that one instruction instead of hanging until Undo.
      // Enemy AI retains its separate re-route/cover behavior below.
      if(a.side!=='red'&&pendingDoor){
        failCurrentOrder(s,a,pendingDoor,
          'PATH BLOCKED · DOOR '+opening.reason.toUpperCase(),hooks.notify);
        a.blockedTime=0;
        return {paused:true,closed:false};
      }
      // A blocked door remains physically closed; no AI magic opening.
      if(a.side==='red'&&a.blockedTime>1.2){
        a.nav=[];a.alert='cover';a.contact=null;
      }
      return {paused:true,closed:false};
    }
    a.velocity=0;a.actionTimer+=dt;
    if(a.actionTimer>=.36&&!doorAhead.open){
      doorAhead.open=true;doorAhead.openedAt=s.seconds;
      hooks.hear(s,doorCenter(doorAhead),125,'door');
      hooks.notify(s,a.name+' OPENED '+doorAhead.id);
    }
    if((doorAhead.openFraction??0)<.72){
      // Hinge can be body-obstructed at 57–65% for many seconds.
      // Once its angular motor has truly STOPPED, let the single existing
      // swept collision motor attempt the movement and, if necessary,
      // its regular bounded route recovery. There is no free passage.
      // Incidental body CLOSE on this exact leaf is deferred ONLY for
      // this motor attempt, preventing the D3.1 277-flip ping-pong.
      if(a.side==='blue'&&stalledDoorYieldsToMotor(doorAhead,a.actionTimer)){
        // D3.8: a hand-assisted hinge can stop against the bodies trying to
        // open it. This motor path formerly reset blockedTime every tick,
        // so collision's existing self-clearance never got a turn.
        // Only after a sustained stationary OPEN episode, stage ONE short,
        // fully swept, teammate-clear relief from that same existing helper.
        // This preserves the authored MOVE and lets the ordinary motor
        // execute the feet on subsequent ticks. No teleport/leaf override.
        const episode=a.doorTraversal;
        if(pendingDoor?.kind==='move'&&episode?.doorId===doorAhead.id&&
           episode.phase!=='release'&&
           episode.maneuver!=='outside-leaf'&&
           a.actionTimer>=2.5&&
           s.seconds-episode.lastProgressAt>=1.8&&
           // Share the existing four rehearsal attempts; allow two
           // subsequent, bounded physical self-clearance attempts even
           // if the earlier leaf-bypass candidates failed to route.
           episode.maneuverAttempts<6&&
           s.seconds>=episode.nextManeuverAt){
          const relief=selfBlockingHingeRelief(a,s,p);
          episode.maneuverAttempts++;
          episode.nextManeuverAt=s.seconds+2;
          if(relief){
            episode.maneuver='outside-leaf';
            episode.waypoints=[{...relief}];episode.waypointIndex=0;
            episode.phase='clear-leaf';
            episode.lastTransitionAt=s.seconds;
            a.nav.unshift(relief);
            a.retryRouteAt=0;a.recoveryAttempts=0;
            a.motorPause=null;
            return {paused:true,closed:false};
          }
        }
        a.motorPause=null;
        return {paused:false,closed:false,clearingDoorId:doorAhead.id};
      }
      // A partly open outward leaf can physically occupy the approach side.
      // A MOVING crossing operator may now sidestep or grasp its handle;
      // holding the entire motor in DOOR OPENING prevented either recovery.
      // Continue only after a short lawful opening attempt. The following
      // swept-body motor still treats the leaf as completely SOLID.
      if(operatorCrossingDoor(a,doorAhead)&&a.actionTimer>=.65){
        if(a.actionTimer>=2.5&&a.actionTimer-dt<2.5)
          hooks.notify(s,a.name+
            ' DOOR SWING OBSTRUCTED · CHECK ENTRY');
        a.motorPause=null;
        return {paused:false,closed:false};
      }
      return {paused:true,closed:false};
    }
    a.actionTimer=0;
  }else if(a.side==='red')a.actionTimer=0;
  const closed=!!closedDoor&&!closedDoor.open&&
    pointToSegment(move,doorLeafSegment(closedDoor))<9.5&&
    pointToSegment(move,doorLeafSegment(closedDoor))<
      pointToSegment(a.p,doorLeafSegment(closedDoor))+0.001;

 return {paused:false,closed};
}
