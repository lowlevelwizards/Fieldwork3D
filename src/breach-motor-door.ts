import {sessionWorldGeometry} from './breach-world-context.ts';
import {nearMotorDoorStroke} from './breach-motor-door-broadphase.ts';
/** Stage 7: handle physical closed leaves and intentional automatic
 * opens before body contact. Explicit authored DOOR actions retain priority.
 */
import {pointToSegment,doorLeafSegment,doorBlocksSegment,doorCenter,
 OPERATOR_RADIUS,type Pt,type Door} from './breach-core.ts';
import type {TeamActor,Session} from './breach-game.ts';
import {canAutoOpenEnRoute,autoDoorAtBodyContact,crossesDoorThreshold,doorApproach,
 doorReachable,doorWouldStrikeActors} from './breach-door.ts';
import {doorInteraction} from './breach-interactions.ts';
import {doorSecuredFrom,releasePrivacyLockOnOpen} from './breach-door-security.ts';
import {operatorCrossingDoor} from './breach-door-pressure-arbitration.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {d,type ActorMotorHooks} from './breach-motor-contract.ts';
import {failCurrentOrder} from './breach-order-lifecycle.ts';
import {noteD32MotorDoorSelection} from './breach-d3-motor-door-witness.ts';
import {selfBlockingHingeRelief} from './breach-door-traversal-maneuver.ts';
import {shouldStageForOpening,mayManipulateOpening,claimOpeningIntent}
 from './breach-door-opening-ownership.ts';
import {releaseDoorHandContact} from './breach-door-hand-contact.ts';
import {openingFootwork,setOpeningFootstep,queueOpeningFootstep,clearOpeningFootwork,
  openingSweepThreatens,stoppedHighPartialEntryStrike,
  upcomingOpeningSweep,selectGuidedOpeningStep}
 from './breach-door-opening-footwork.ts';

/** D3.2.5: an opened hinge that has STOPPED well below its target may
 * no longer monopolize the actor motor. The ordinary collision/recovery
 * pipeline gets its attempt, with that same leaf protected from incidental
 * closing. This is not a collision exemption or a forced movement.
 * The hinge remains solely responsible for actual leaf rotation.
 */
export function stalledDoorYieldsToMotor(door:Door,openingSeconds:number,
 actorPosition?:Pt):boolean{
 const fraction=door.openFraction??(door.open?1:0);
 return door.open&&(!door.locked||actorPosition!==undefined&&
   !doorSecuredFrom(door,actorPosition))&&!door.heldBy&&!door.wedged&&
   fraction>=.15&&fraction<.72&&openingSeconds>=.9&&
   Math.abs(door.angularVelocity??0)<.16;
}

/** D3.15A2: a real authored DOOR node owns its execution timer.
 * The generic move motor may reset transient implicit OPEN timers, but
 * must never erase the 0.78s explicit opening action while its operator
 * performs physically swept corrective footwork beside that same leaf.
 */
export function preserveExplicitDoorActionClock(
 pending:{kind:string}|null|undefined
):boolean{return pending?.kind==='door';}

/** D3.29D: the implicit hinge motor may never interpret ANY rejected
 * OPEN capability as permission to animate. A physically encountered lock
 * takes precedence over an earlier out-of-reach rejection; neither may
 * swing the leaf. No remote manipulation or collision exemption.
 */
export function implicitOpenDenial(
 door:Pick<Door,'locked'|'jammed'|'wedged'|'heldBy'> &
  Partial<Pick<Door,'a'|'b'|'lockSide'>>, 
 verdict:{allowed:boolean;reason:string|null},actorId:string,
 actorPosition?:Pt
):string|null{
 if(door.locked&&(!actorPosition||!door.a||!door.b||
     doorSecuredFrom(door as Door,actorPosition)))return 'locked';
 if(door.jammed||door.wedged)return 'obstructed';
 if(door.heldBy&&door.heldBy!==actorId)return 'held';
 // A real threshold crossing on an otherwise unlocked operable panel
 // may be outside the narrow handle reach at this exact motor microstep.
 // Preserve the D3.28 opening/physical passage behavior for that case:
 // the motor still requires its crossing/contact gates and swept motion.
 // Only physical latch/brace prohibitions may veto the opening here.
 return verdict.reason==='out-of-reach'?null:
   verdict.allowed?null:verdict.reason;
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
    // Nearby parallel wall routes can brush a swung leaf's capsule.
    // They never authorize an implicit OPEN without an actual doorway
    // crossing or the active, same-order threshold episode.
    const crossing=crossesDoorThreshold(a.p,next,door)||
      (a.nav[1]!==undefined&&crossesDoorThreshold(next,a.nav[1],door))||
      a.doorTraversal?.doorId===door.id&&
       a.doorTraversal.authoredOrderId===pendingDoor?.id;
    if(!crossing)continue;
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
  if(!doorAhead){
    const touched=autoDoorAtBodyContact(a.p,move,
      s.doors,sessionWorldGeometry(s),pendingDoor,a.side==='red');
    if(touched&&(crossesDoorThreshold(a.p,next,touched)||
      (a.nav[1]!==undefined&&crossesDoorThreshold(next,a.nav[1],touched))||
      a.doorTraversal?.doorId===touched.id&&
       a.doorTraversal.authoredOrderId===pendingDoor?.id))doorAhead=touched;
  }
  // A follower's physical clearing step can take them past the handle's
  // reach. Keep their SAME active threshold in scope until its aperture
  // is traversable; otherwise they immediately walk back into the sweep.
  if(!doorAhead&&a.side==='blue'&&pendingDoor?.kind==='move'&&
     a.doorTraversal?.authoredOrderId===pendingDoor.id){
    const episodeDoor=s.doors.find(d=>d.id===a.doorTraversal!.doorId);
    // Keep the current physical leaf in scope only for the SAME
    // generated ENTRY and authored order. An ordinary authored MOVE
    // is never entitled to high-partial swing clearance by proximity.
    const sameGeneratedEntry=!!episodeDoor&&
      pendingDoor.entryDoorId===episodeDoor.id&&
      a.doorTraversal?.doorId===episodeDoor.id;
    if(episodeDoor&&d(a.p,doorCenter(episodeDoor))<80&&
       ((episodeDoor.openFraction??0)<.72||
        sameGeneratedEntry&&
        stoppedHighPartialEntryStrike(episodeDoor,a.p)))
      doorAhead=episodeDoor;
  }
  if(doorAhead){
    const openingAllowed=claimOpeningIntent(s,a,doorAhead);
    // When this one door is physically stalled, its designated opener
    // ALSO must be able to vacate the leaf's sweep. Keep the same
    // bounded temporary footstep for opener and followers alike.
    const follower=shouldStageForOpening(s,a,doorAhead);
    const stopped=doorAhead.open&&
      (doorAhead.openFraction??0)>=.15&&
      (doorAhead.openFraction??0)<.72&&
      Math.abs(doorAhead.angularVelocity??0)<.16;
    const generatedEntryOwner=a.side==='blue'&&
      pendingDoor?.kind==='move'&&
      pendingDoor.entryDoorId===doorAhead.id&&
      a.doorTraversal?.doorId===doorAhead.id&&
      a.doorTraversal.authoredOrderId===pendingDoor.id;
    const highPartialEntry=generatedEntryOwner&&
      stoppedHighPartialEntryStrike(doorAhead,a.p);
    const threatens=a.side==='blue'&&doorAhead.open&&
      (openingSweepThreatens(doorAhead,a.p)||highPartialEntry);
    const ownerRelief=!follower&&a.side==='blue'&&
      pendingDoor?.kind==='move'&&
      (stopped&&a.actionTimer>=1.5||threatens);
    if(follower||ownerRelief){
      // No follower may open, push, or retain a hand on this partial leaf.
      // All physical clearance still runs through the existing motor.
      // Only a non-owner drops the hand. An opener with reachable contact
      // must be allowed to guide the leaf WHILE executing the footstep.
      if(follower)releaseDoorHandContact(a,s.seconds);
      const order=a.plan[0]!;
      const staged=openingFootwork(a,doorAhead.id,order.id,'swing');
      if(staged.target){
        const distance=d(a.p,staged.target);
        if(distance>3.5){
          // Once chosen, clearance outranks the obstructed original grid
          // waypoint until the SAME full-body motor reaches it. Old route
          // repair must not silently replace this safety-critical footstep.
          queueOpeningFootstep(a,staged.target);
          a.motorPause=null;
          return {paused:false,closed:false,clearingDoorId:doorAhead.id};
        }
        staged.target=null;
      }
      if(follower||ownerRelief){
        // A valid authored stride takes priority over a NEW clearance
        // detour. Otherwise a safe approach can be replaced by a needless
        // retreat and lose seconds, despite never threatening the leaf.
        const swing=upcomingOpeningSweep(doorAhead);
        if(!doorWouldStrikeActors(doorAhead,swing,[move],OPERATOR_RADIUS)&&
           sweptBodyClear(a.p,move,s.doors,OPERATOR_RADIUS,
             sessionWorldGeometry(s))){
          a.motorPause=null;
          return {paused:false,closed:false,clearingDoorId:doorAhead.id};
        }
      }
      // Only an operator ACTUALLY in the moving sweep needs to step
      // backwards/laterally. Reuse the existing rate-limited, full-body
      // self-clearance library instead of a new formation route solver.
      if(staged.attempts<5&&s.seconds>=staged.nextAt&&
         (follower||ownerRelief)){
        const retreat=threatens?
          selectGuidedOpeningStep(a,s,doorAhead,p,highPartialEntry)||
            (stopped||highPartialEntry?
              selfBlockingHingeRelief(a,s,p,doorAhead,
                highPartialEntry):null):
          selfBlockingHingeRelief(a,s,p,doorAhead);
        staged.nextAt=s.seconds+1.1;
        if(retreat){
          staged.attempts++;
          setOpeningFootstep(a,staged,retreat);
          // A reachable, physically swept transient waypoint. No body
          // translation here; actual movement occurs on the next tick.
          queueOpeningFootstep(a,retreat);
          a.retryRouteAt=0;
          if(follower)releaseDoorHandContact(a,s.seconds);
          a.motorPause=null;
          return {paused:true,closed:false};
        }
      }
      if(follower){
        a.velocity=0;a.motorPause='door-opening';
        return {paused:true,closed:false};
      }
      // Opener may keep operating after a legal shoulder clearance.
      // A blocked attempt remains under the ordinary D3 motor authority.
    }
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
         ...s.civilians.filter(c=>c.health>0).map(c=>c.p)],0,s.doors);
      if(staged&&d(staged,a.p)>5&&d(staged,a.p)<50&&
         sweptBodyClear(a.p,staged,s.doors,8,sessionWorldGeometry(s))){
        a.nav.unshift(staged);a.velocity=0;
        a.motorPause=null;return {paused:true,closed:false};
      }
    }
    // No non-owner may issue a second automatic OPEN; the physical motor
    // can still cross a genuinely clear aperture without this permission.
    if(!openingAllowed||!mayManipulateOpening(s,a,doorAhead)){
      a.motorPause=null;
      return {paused:false,closed:false,clearingDoorId:doorAhead.id};
    }
    a.motorPause='door-opening';
    noteD32MotorDoorSelection(a,doorAhead.id,s.seconds);
    const opening=doorInteraction({target:doorAhead,actorId:a.id,
      actorPosition:a.p,action:'open'});
    const denial=implicitOpenDenial(doorAhead,opening,a.id,a.p);
    if(denial==='held'||denial==='locked'||denial==='obstructed'){
      a.motorPause=denial==='held'?'door-held':
        denial==='locked'?'door-locked':'door-obstructed';
      a.lastBlocker='door';
      a.velocity=0;a.blockedTime+=dt;
      // An authored MOVE/OPEN cannot proceed through a known blocked
      // portal. Drop that one instruction instead of hanging until Undo.
      // Enemy AI retains its separate re-route/cover behavior below.
      if(a.side!=='red'&&pendingDoor){
        failCurrentOrder(s,a,pendingDoor,
          'PATH BLOCKED · DOOR '+denial.toUpperCase(),hooks.notify,
          doorAhead.id);
        a.blockedTime=0;
        return {paused:true,closed:false};
      }
      // A blocked door remains physically closed; no AI magic opening.
      if(a.side==='red'&&a.blockedTime>1.2){
        a.nav=[];a.alert='cover';a.contact=null;
      }
      return {paused:true,closed:false};
    }
    // Out-of-reach / already-open and every other refused implicit OPEN
    // must yield to the unchanged swept-body motor. Previously this path
    // incremented the OPEN timer and could animate a CLOSED LOCKED leaf.
    if(denial){
      if(!preserveExplicitDoorActionClock(pendingDoor))a.actionTimer=0;
      a.motorPause=null;
      return {paused:false,closed:false};
    }
    a.velocity=0;a.actionTimer+=dt;
    if(a.actionTimer>=.36&&!doorAhead.open){
      releasePrivacyLockOnOpen(doorAhead,a.p);
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
      if(a.side==='blue'&&stalledDoorYieldsToMotor(doorAhead,a.actionTimer,a.p)){
        // D3.9's shared owner/follower traffic staging above is the ONLY
        // cold self-clearance authority. Do not separately create a second
        // D3.8 episode retry, whose transient nav could fight the first.
        a.motorPause=null;
        return {paused:false,closed:false,clearingDoorId:doorAhead.id};
      }
      // With an actual physical hand attached, permit the ordinary
      // full-radius swept motor to execute the guided pivot. Holding the
      // DOOR OPENING pause here would make the hand and feet mutually exclusive.
      if(a.side==='blue'&&
         a.doorHandContact?.doorId===doorAhead.id&&
         a.doorHandContact.releasedAt===null){
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
    // The auto-open motor normally clears a temporary opening timer
    // after its physical step. An authored DOOR OPEN/KICK/CLOSE/HOLD,
    // however, owns its own actionTimer in breach-order-door.ts. Resetting
    // it here made an already-opening, self-blocked leaf wait forever while
    // the explicit opener tried to sidestep at the frame.
    if(!preserveExplicitDoorActionClock(pendingDoor))a.actionTimer=0;
    if(pendingDoor?.kind==='move')
      clearOpeningFootwork(a,doorAhead.id,pendingDoor.id);
  }else if(a.side==='red')a.actionTimer=0;
  const closed=!!closedDoor&&!closedDoor.open&&
    pointToSegment(move,doorLeafSegment(closedDoor))<9.5&&
    pointToSegment(move,doorLeafSegment(closedDoor))<
      pointToSegment(a.p,doorLeafSegment(closedDoor))+0.001;

 return {paused:false,closed};
}
