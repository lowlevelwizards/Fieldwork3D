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

/** D3.2.3: a short pre-existing nav leg completely valid under the CURRENT
 * physical leaf requires no further opening. This never changes a route,
 * claims clearance for a future step, or loosens swept collision. It is
 * evaluated only after a partially open hinge has actually stopped.
 */
export function shortClearLegPastStalledLeaf(from:Pt,next:Pt,
 door:Door,seconds:number,
 swept:(from:Pt,to:Pt)=>boolean):boolean{
 const fraction=door.openFraction??(door.open?1:0);
 if(!door.open||door.wedged||door.heldBy||door.locked||
   fraction<.32||fraction>=.72||seconds<.85||
   Math.abs(door.angularVelocity??0)>.16)return false;
 const distance=d(from,next);
 if(distance<.1||distance>22)return false;
 // The entire *current* nav segment must be lawfully open at this
 // instantaneous leaf angle, including its normal body radius.
 return pointToSegment(next,doorLeafSegment(door))>=OPERATOR_RADIUS+1&&
   swept(from,next);
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
      // A different operator may be standing inside the hinge's sweep,
      // stopping at 57–65% open. Do NOT wait for an arbitrary 72% angle
      // when the CURRENT short nav leg is ALREADY fully body-sweep clear.
      // Exactly this door remains protected from incidental body CLOSE
      // while that one step goes through the normal movement authority.
      if(a.side==='blue'&&shortClearLegPastStalledLeaf(
         a.p,next,doorAhead,a.actionTimer,
         (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,
          sessionWorldGeometry(s)))){
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
