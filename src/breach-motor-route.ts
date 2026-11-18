import {setTransientRoute,noteDoorHandoffRejection,hasTransientRouteObserver} from './breach-route-transition.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
/** Fixed-clock transient route acquisition and backoff. This never
 * rewrites the player-authored PlanNode[] or grants collision authority.
 */
import {OPERATOR_RADIUS,doorLeafSegment,doorCenter,pointToSegment,type Pt}
 from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {pressDoorOnBodyAttempt,crossesDoorThreshold} from './breach-door.ts';
import {sessionDoorPressurePolicy}
 from './breach-door-pressure-frame.ts';
import {recordDoorManeuverContact,tryGoalCompleteDoorHandoffAfterEscape}
 from './breach-door-traversal-maneuver.ts';
import {escapeOpenDoorOverlap,sweptBodyClear,bodyClear} from './breach-navigation.ts';
import {routeWithSqueezeIntel,routeWithSqueezeWorld,routeWithNormalWorld,
 routeToNextOperableDoor,coldFineMotorWorldRoute}
 from './breach-squeeze-route.ts';
import {diagnoseMovement} from './breach-nav-diagnostics.ts';
import {routeRetrySeconds,provisionalRouteAccepted} from './breach-movement-recovery.ts';
import {shouldPauseNegativeGoalProbe,noteFailedRouteProbe,
 knownIntelRouteKey} from './breach-cold-route-cache.ts';
// Cache only proven unsuccessful route probes, never a guessed blocked GO.
// A changed object/door/order or 4 seconds of real time reopens the query.
import {holdKnownFixedAuthoredGoal}
 from './breach-authored-goal-block.ts';
import {tryAutoClearClutter} from './breach-motor-clutter.ts';
import {d,clone,type ActorMotorHooks} from './breach-motor-contract.ts';
import {sweptRejoinExistingRoute,takeRepeatedDoorEscapeRoute,
 finishDoorEscapeRejoin,claimColdFrameApproachProbe,
 claimColdFuturePortalProbe}
 from './breach-door-escape-rejoin.ts';
import {joinedLocalOpenLeafStage} from './breach-door-escape-stage.ts';
import {sweptProfileClear,squeezeFacing} from './breach-navigation.ts';
import {findBoundedNarrowLeafExit,claimNarrowLeafExitProbe,
 ownNarrowExitWaypoints} from './breach-squeeze-leaf-exit.ts';
import {coldSweptEntryEscapeJoin} from './breach-d325-escape-join.ts';
import {claimD326ColdFineProbe,markD326FineMotorRoute}
 from './breach-d326-fine-route-gate.ts';
import {notePreciseLocalDetour} from './breach-motor-local-detour.ts';

/** After an ACTUAL swept door overlap escape, prefer one physical
 * world-truth connector past a STABLE fully-open leaf. Otherwise a
 * temporary intel route can immediately walk the feet back INTO the
 * same solid panel, causing endless 0.7-unit reverse/forward motion.
 * One cold (>=0.7s) route probe; untouched authored GO order; no
 * second physical movement controller or ghost clearance.
 */
export function restoreAfterOpenLeafEscape(
 a:TeamActor,s:Session,goal:Pt
):boolean{
 if(s.seconds-a.lastNavRepairAt<.7){
  noteDoorHandoffRejection(s,a,'world:cooldown');return false;
 }
 // D3.25F: a real partial-leaf escape may produce a full-body-clear
 // center whose normal grid FIRST LEG still clips that stationary panel.
 // Only a generated ENTRY currently grabbing that SAME leaf can cold
 // probe one extra 3/5/8-unit continuation along the last ACTUAL swept
 // escape direction. Every proposal is certified against live full-body
 // collision; ordinary motor remains the sole executor on later ticks.
 const entry=a.plan[0],episode=a.doorTraversal;
 if(a.side==='blue'&&a.lastBlocker==='door'&&a.priorP&&
    entry?.kind==='move'&&entry.entryDoorId&&
    episode?.doorId===entry.entryDoorId&&
    episode.maneuver==='grab-and-hold'){
  const leaf=s.doors.find(door=>door.id===entry.entryDoorId&&
    door.open&&!door.locked&&!door.jammed&&!door.wedged&&
    !door.heldBy&&(door.openFraction??0)>=.90&&
    (door.openFraction??0)<.98&&
    Math.abs(door.angularVelocity??0)<.16&&
    pointToSegment(a.p,doorLeafSegment(door))<OPERATOR_RADIUS+13);
  if(leaf){
   const world=sessionWorldGeometry(s);
   const swept=(from:Pt,to:Pt)=>
     sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world);
   const staged=coldSweptEntryEscapeJoin(a.priorP,a.p,goal,
     at=>bodyClear(at,s.doors,OPERATOR_RADIUS,world),swept,
     (from,to)=>routeWithSqueezeWorld(from,to,s.doors,world));
   if(staged.length){
    a.lastNavRepairAt=s.seconds;
    setTransientRoute(s,a,staged,'door-leaf-escape');
    provisionalRouteAccepted(a);
    return true;
   }
  }
 }
 const near=s.doors.some(door=>door.open&&
  (door.openFraction??0)>=.96&&
  Math.abs(door.angularVelocity??0)<.16&&
  pointToSegment(a.p,doorLeafSegment(door))<OPERATOR_RADIUS+13);
 if(!near){
  noteDoorHandoffRejection(s,a,'world:no-stable-open-leaf');return false;
 }
 a.lastNavRepairAt=s.seconds;
 const world=sessionWorldGeometry(s);
 const route=routeWithSqueezeWorld(a.p,goal,s.doors,world);
 if(!route.length){
  noteDoorHandoffRejection(s,a,'world:no-full-body-route');return false;
 }
 if(!sweptBodyClear(a.p,route[0],s.doors,OPERATOR_RADIUS,world)){
  noteDoorHandoffRejection(s,a,'world:first-leg-not-swept');return false;
 }
 setTransientRoute(s,a,route,'door-leaf-escape');
 provisionalRouteAccepted(a);
 return true;
}
/** G2B: only after THREE repeated real leaf escapes and after the body
 * itself is no longer embedded, pay for one cold, bounded physical-world
 * connector to a NEARBY node on the actor's ORIGINAL temporary route.
 * Later closed doors stay real and must be opened by the normal motor.
 * Never substitute the local waypoint for the authored final GO.
 */
export function restoreRepeatedDoorEscapeRoute(
 a:TeamActor,s:Session,goal:Pt
):boolean{
 if(a.side!=='blue'||a.plan[0]?.kind!=='move'||
    a.lastBlocker!=='door'||!a.doorTraversal?.doorId||
    (a.doorTraversal.maneuver==='outside-leaf'&&
     a.doorTraversal.waypoints.length>0))return false;
 const world=sessionWorldGeometry(s);
 if(!bodyClear(a.p,s.doors,OPERATOR_RADIUS,world)){
   noteDoorHandoffRejection(s,a,'h:body-still-overlapping');return false;
 }
 const original=takeRepeatedDoorEscapeRoute(a,s.seconds,goal);
 if(!original){
   noteDoorHandoffRejection(s,a,'h:no-eligible-repeat-evidence');return false;
 }
 const sweep=(from:Pt,to:Pt)=>
   sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world);
 let rejoined=sweptRejoinExistingRoute(a.p,goal,original,sweep);
 // Directly skipping a stale grid node was the safe, but ineffective,
 // G2A experiment. Now permit at most three COLD world-truth joins to
 // nearby disposable waypoints, not the remote goal behind more doors.
 if(!rejoined.length)
  for(let i=1;i<Math.min(original.length,5);i++){
   const target=original[i],span=d(a.p,target);
   if(span<5||span>112)continue;
   const connector=routeWithNormalWorld(a.p,target,s.doors,world);
   if(!connector.length||d(connector[connector.length-1],target)>3||
      !sweep(a.p,connector[0]))continue;
   let length=0,from=a.p,valid=true;
   for(const node of connector){
    if(!sweep(from,node)){valid=false;break;}
    length+=d(from,node);from=node;
   }
   if(!valid||length>Math.max(120,span*2.5+24))continue;
   rejoined=[...connector.map(clone),...original.slice(i+1).map(clone)];
   break;
  }
 // G2C: the original route's next grid node may be hundreds of units
 // beyond this leaf. In that case a world connector *to that node*
 // cannot help; try a tiny swept-clear physical leaf stage, followed
 // by an intel continuation with the real authored goal still last.
 const stageDoor=a.doorTraversal?.doorId?
   s.doors.find(door=>door.id===a.doorTraversal?.doorId):undefined;
 let usedLocalStage=false;
 if(!rejoined.length&&stageDoor&&
    pointToSegment(a.p,doorLeafSegment(stageDoor))<OPERATOR_RADIUS+44){
   rejoined=joinedLocalOpenLeafStage(a.p,goal,stageDoor,sweep,
     point=>bodyClear(point,s.doors,OPERATOR_RADIUS,world),
     (point,destination)=>routeWithSqueezeIntel(s.intel,point,destination),
     hasTransientRouteObserver()?
       reason=>noteDoorHandoffRejection(s,a,'h:stage:'+reason):undefined,
     (from,to)=>claimColdFrameApproachProbe(a,stageDoor.id,goal,
       stageDoor.openFraction??0)?
         routeWithNormalWorld(from,to,s.doors,world):[]);
   usedLocalStage=rejoined.length>0;
 }else if(!rejoined.length){
   noteDoorHandoffRejection(s,a,'h:leaf-unavailable-or-far');
 }
 if(!rejoined.length||d(rejoined[rejoined.length-1],goal)>3){
   noteDoorHandoffRejection(s,a,'h:no-accepted-local-rejoin');
   // H4: after a witnessed THREE-escape open-leaf loop where every
   // local full-width approach is impossible, try the motor's EXISTING
   // D3.3 physical prefix to the FIRST FUTURE OPERABLE DOOR. Ordinary
   // world routing to the final GO can legitimately fail behind that
   // door. The prefix never completes the authored PlanNode and its
   // actual hinge contact/open remains governed by the same motor.
   // One cold A* proposal per unchanged door/order/physical position.
   if(stageDoor?.open&&(stageDoor.openFraction??0)>=.82&&
      claimColdFuturePortalProbe(a,stageDoor.id,goal,
        stageDoor.openFraction??0)){
     const prefix=routeToNextOperableDoor(a.p,goal,s.doors,world);
     let cost=0,at=a.p;
     for(const point of prefix){cost+=d(at,point);at=point;}
     if(prefix.length>=2&&sweep(a.p,prefix[0])&&
        d(a.p,prefix[0])<=96&&cost<=d(a.p,goal)*1.9+48){
       setTransientRoute(s,a,prefix,'door-escape-future-portal');
       finishDoorEscapeRejoin(a);
       a.lastNavRepairAt=s.seconds;provisionalRouteAccepted(a);
       return true;
     }
     noteDoorHandoffRejection(s,a,'h:future-portal-prefix-unavailable');
   }
   // D3.14B2: a fully opened D9-style leaf can trap an operator in
   // repeated squeezed-footwork / intel-route reacquisition even when
   // the actual body is clear. Only a proven GENERATED ENTRY episode,
   // in genuine grab-and-hold / clear-leaf mode, may try ONE bounded
   // physically swept narrow-stage route around the panel. The short
   // steps are executed by the normal motor, not moved here.
   if(a.squeeze&&stageDoor?.open&&
      (stageDoor.openFraction??0)>=.82&&
      Math.abs(stageDoor.angularVelocity??0)<.16&&
      a.doorTraversal?.phase==='clear-leaf'&&
      a.doorTraversal.maneuver==='grab-and-hold'&&
      claimNarrowLeafExitProbe(a,stageDoor.id,goal,
       stageDoor.openFraction??0)){
     const narrow=(from:Pt,to:Pt)=>
       sweptProfileClear(from,to,s.doors,
         squeezeFacing(Math.atan2(to.y-from.y,to.x-from.x)),
         'squeeze',world);
     const stages=findBoundedNarrowLeafExit(
       a.p,goal,original[0],narrow,sweep);
     if(stages.length){
       setTransientRoute(s,a,[...stages.map(clone),
         ...original.map(clone)],'door-squeeze-leaf-exit');
       ownNarrowExitWaypoints(a,stages);
       finishDoorEscapeRejoin(a);
       a.lastNavRepairAt=s.seconds;
       provisionalRouteAccepted(a);
       return true;
     }
     noteDoorHandoffRejection(s,a,'d314b:no-full-squeeze-join');
   }
   return false;
 }
 setTransientRoute(s,a,rejoined,
   usedLocalStage?'door-escape-local-portal':'door-escape-world-rejoin');
 finishDoorEscapeRejoin(a);
 a.lastNavRepairAt=s.seconds;provisionalRouteAccepted(a);
 return true;
}
/** A kicked-off latch does not clear the leaf instantly, but an old
 * locked-door detour can become obsolete when the real hinge clears. */
const forcedDoorRechecks=new WeakMap<TeamActor,{goal:string;attempts:Map<string,number>}>();
const routeLength=(start:Pt,path:readonly Pt[])=>{
 let total=0,previous=start;
 for(const next of path){total+=d(previous,next);previous=next;}
 return total;
};
export function forcedDoorShortcutWorthTaking(start:Pt,
 oldPath:readonly Pt[],candidate:readonly Pt[]):boolean{
 if(!oldPath.length||!candidate.length)return false;
 const original=routeLength(start,oldPath),next=routeLength(start,candidate);
 return original-next>=32&&next<=original*.82;
}
/** Compare at most twice per actor/goal/physically kicked door, at
 * two real opening thresholds. No hidden-world intel discovery, teleport,
 * authored-goal rewrite or automatic unlock. */
export function refreshRouteAfterForcedDoor(a:TeamActor,goal:Pt,s:Session):boolean{
 const order=a.plan[0];
 if(a.side!=='blue'||order?.kind!=='move'||!a.nav.length||
    order.entryDoorId||order.stackDoorId||a.doorTraversal||
    a.traversal||a.traversalPending||a.fireRetreatTarget||
    a.autoSidestep||a.squeeze||d(a.p,goal)<35)return false;
 const goalKey=Math.round(goal.x*2)+':'+Math.round(goal.y*2);
 let checked=forcedDoorRechecks.get(a);
 if(!checked||checked.goal!==goalKey){
  checked={goal:goalKey,attempts:new Map()};
  forcedDoorRechecks.set(a,checked);
 }
 for(const door of s.doors){
  if(!door.latchBroken||!door.open||door.locked||door.jammed||
     door.wedged||door.heldBy||door.hardwareDetachedAt===undefined||
     !s.intel.doors.has(door.id)||
     d(a.p,doorCenter(door))>250||
     !crossesDoorThreshold(a.p,goal,door))continue;
  const fraction=door.openFraction??0;
  const phase=fraction>=.98?2:fraction>=.72?1:0;
  if(!phase||phase<=(checked.attempts.get(door.id)??0))continue;
  checked.attempts.set(door.id,phase);
  const candidate=routeWithNormalWorld(a.p,goal,s.doors,
    sessionWorldGeometry(s));
  if(!forcedDoorShortcutWorthTaking(a.p,a.nav,candidate))continue;
  setTransientRoute(s,a,candidate,'forced-door-shortcut');
  a.retryRouteAt=0;
  return true;
 }
 return false;
}
export type MotorRouteReadiness='ready'|'handled'|'unavailable';
export function prepareMotorRoute(
 a:TeamActor,p:Pt,dt:number,s:Session,hooks:ActorMotorHooks):MotorRouteReadiness{
  const goalKey=Math.round(p.x*2)+':'+Math.round(p.y*2);
  if(a.routeGoalKey!==goalKey){
    a.autoSidestep=null;
    a.routeGoalKey=goalKey;a.retryRouteAt=0;a.recoveryAttempts=0;
    a.lastNormalLaneProbeAt=-10;
  }
  if(!a.nav.length){
    // D3.10B: after real retries have established a known, immovable
    // authored landing, do not run the same A* and contact probes forever.
    // The issue stays visible, and any authored-goal/cover change wakes it.
    if(holdKnownFixedAuthoredGoal(s,a,p,goalKey,dt,hooks.notify))
      return 'unavailable';
    // Completed D2 temporary doorway footwork returns to the original
    // authored destination, not another arbitrary temporary node.
    if(a.doorTraversal?.maneuver==='outside-leaf'){
      a.doorTraversal.waypoints=[];
      a.doorTraversal.waypointIndex=0;
    }
    // A hinge from an earlier state can leave the operator embedded in its
    // collision capsule. Take a bounded real swept step out before route
    // backoff; do not demand a new waypoint or let the route fail forever.
    const escape=escapeOpenDoorOverlap(a.p,p,s.doors,dt*45,sessionWorldGeometry(s));
    if(escape){
      a.priorP=clone(a.p);a.p=escape;a.velocity=0;
      a.blockedTime=0;a.lastBlocker='door';
      if(tryGoalCompleteDoorHandoffAfterEscape(a,s,p))return 'handled';
      if(!restoreAfterOpenLeafEscape(a,s,p))a.retryRouteAt=0;
      return 'handled';
    }
    if(restoreRepeatedDoorEscapeRoute(a,s,p))return 'ready';
    // Never execute expensive route searches every fixed tick for a proven
    // unreachable destination. Changes of goal or recovered progress reset.
    // A route may be temporarily unavailable solely because a swung leaf
    // crosses its doorway. Keep attempting *physical* pressure along the
    // player's actual goal, even during backoff. No invented path or teleport.
    const goalDistance=d(a.p,p);
    if(goalDistance>2){
      const probeLength=Math.min(4,goalDistance);
      const probe={x:a.p.x+(p.x-a.p.x)/goalDistance*probeLength,
        y:a.p.y+(p.y-a.p.y)/goalDistance*probeLength};
      const contact=pressDoorOnBodyAttempt(a.p,probe,s.doors,dt,
        ()=>s.operators.filter(o=>o.health>0).map(o=>o.p),
        sessionDoorPressurePolicy(s,a),sessionWorldGeometry(s));
      recordDoorManeuverContact(a,s,contact);
    }
    // When two chairs interlock there may be no navigable path, so the
    // ordinary collision branch cannot run. Probe only a real, short
    // goal-directed body step; no furniture may be shifted at a distance.
    if(a.side==='blue'&&a.plan[0]?.kind==='move'&&
       s.seconds-a.lastAutoShoveAt>.38&&goalDistance>2){
      const distance=Math.min(4,goalDistance);
      const contactProbe={x:a.p.x+(p.x-a.p.x)/goalDistance*distance,
        y:a.p.y+(p.y-a.p.y)/goalDistance*distance};
      if(diagnoseMovement(a.p,contactProbe,s.doors,[],OPERATOR_RADIUS,
         sessionWorldGeometry(s)).blocker==='furniture'&&
         tryAutoClearClutter(s,a,contactProbe,hooks))return 'handled';
    }
    // A3.4: a validated 4–10 unit local fire-lane correction is already
    // fully swept before it is selected. Grid navigation can discard such
    // short goals as sub-cell noise, leaving an apparently accepted step
    // with no physical motion. Hand it to the SAME motor and collision
    // pipeline via one real transient waypoint; never translate the body
    // here, relax collision, or touch an authored PlanNode.
    if(a.fireRetreatTarget&&d(p,a.fireRetreatTarget)<.5&&
       goalDistance>=.9&&goalDistance<=12&&
       sweptBodyClear(a.p,p,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s))){
      setTransientRoute(s,a,[{...p}],'fire-retreat');
      provisionalRouteAccepted(a);
      return 'ready';
    }
    if(s.seconds<a.retryRouteAt){
      // C3: a backoff is still REAL time stationary with an active MOVE.
      // Previously blockedTime advanced for only one 60Hz tick per A*
      // attempt, leaving a 20-second unreachable toilet destination
      // reporting as neither blocked nor awaiting action. Do not repeat
      // searches during cooldown; keep the authored order for user edits.
      a.velocity=0;a.blockedTime+=dt;a.lastBlocker='route';
      return 'unavailable';
    }
    // D3.26G3: a genuinely stalled authored MOVE with NO nav never
    // reaches the collision recovery path. Once one ordinary normal-intel
    // request has ALREADY failed and physical door pressure / shove have
    // ALREADY been offered, allow one bounded cold full-body fine-grid
    // retry before another long portal detour. Motel 19143269 proved the
    // fully legal fine path worked, but waiting until 35s left too little
    // of the frozen 45s. A returned path must reach the unchanged GO
    // and pass EVERY actual 0.3-unit motor step. Nothing moves here.
    if(a.side==='blue'&&a.plan[0]?.kind==='move'&&
       !a.plan[0].stackDoorId&&!a.plan[0].entryDoorId&&
       !a.doorTraversal&&!a.traversal&&!a.traversalPending&&
       !a.squeeze&&!a.fireRetreatTarget&&
       a.recoveryAttempts>=1&&a.blockedTime>=1.8&&
       claimD326ColdFineProbe(a,p,s.seconds)){
      const world=sessionWorldGeometry(s);
      const fine=coldFineMotorWorldRoute(a.p,p,s.doors,world);
      if(fine.length){
        setTransientRoute(s,a,fine,'motor-cold-fine-world');
        markD326FineMotorRoute(a);
        notePreciseLocalDetour(a,fine[0]);
        provisionalRouteAccepted(a);
        a.lastNavRepairAt=s.seconds;
        return 'ready';
      }
    }
    // D3.17E6: replay a short *negative* result only if the prior
    // actual route query failed at this same actor/GO and every real door
    // and world-cover revision remains unchanged. Physical door pressure
    // and contact/shove opportunities above have already run this tick.
    if(a.side==='blue'&&a.plan[0]?.kind==='move'&&
       !a.doorTraversal&&shouldPauseNegativeGoalProbe(a,p,s.seconds,
         sessionWorldGeometry(s).revision,s.doors,
         knownIntelRouteKey(s.intel))){
       a.velocity=0;a.blockedTime+=dt;a.lastBlocker='route';
       // A deferred search is NOT an attempted search or retry.
       a.retryRouteAt=s.seconds+.6;
       return 'unavailable';
    }
    setTransientRoute(s,a,a.side==='blue'?routeWithSqueezeIntel(s.intel,a.p,p):
      hooks.cachedEnemyRoute(s,a.p,p,true),
      a.side==='blue'?'initial-intel':'initial-enemy');
    if(!a.nav.length&&a.side==='blue'){
      // A known small object that the player drew THROUGH is a contextual
      // crossing, not a permanently impassable destination. Approach its
      // near edge using ordinary world-truth navigation; only body contact
      // can actually move it. Nothing is learned about hidden furniture.
      const index=hooks.knownShoveCrossing(s,a.p,p);
      if(index!==null){
        const obstacle=s.coverState[index];
        const dx=p.x-a.p.x,dy=p.y-a.p.y;
        const span=Math.hypot(dx,dy)||1;
        const ux=dx/span,uy=dy/span;
        const setback=(Math.abs(ux)*obstacle.w+
          Math.abs(uy)*obstacle.h)/2+OPERATOR_RADIUS+5;
        const staging={x:obstacle.x-ux*setback,
          y:obstacle.y-uy*setback};
        const path=d(a.p,staging)<5?[]:
          routeWithSqueezeWorld(a.p,staging,s.doors,sessionWorldGeometry(s));
        if(d(a.p,staging)<5||path.length)
          setTransientRoute(s,a,[...path,p],'shove-stage');
      }
    }
    // D3.18C Garage: an actor with NO transient nav never reaches the
    // blocked-leg collision replan where D3.3 first-portals were used.
    // After one genuinely failed normal route, permit that SAME existing
    // bounded portal prefix from this cold retry. Its hypothetical crossing
    // does not clear or open the door; the ordinary motor still must press
    // and physically traverse the real hinge. No authored GO edits.
    if(!a.nav.length&&a.side==='blue'&&a.plan[0]?.kind==='move'&&
       a.recoveryAttempts>=1&&!a.doorTraversal&&!a.traversalPending){
      const prefix=routeToNextOperableDoor(a.p,p,s.doors,
        sessionWorldGeometry(s));
      if(prefix.length){
        setTransientRoute(s,a,prefix,'initial-portal-recovery');
        provisionalRouteAccepted(a);
      }
    }
    // Replace a stale long detour only after a verified opened latch.
   if(a.nav.length)refreshRouteAfterForcedDoor(a,p,s);
   if(!a.nav.length){
      // Only an actual failed normal+intel+shove/portal attempt can be
      // cached. Do not claim a remote hidden obstacle is player-known.
      if(a.side==='blue'&&a.plan[0]?.kind==='move')
        noteFailedRouteProbe(a,p,s.seconds,
          sessionWorldGeometry(s).revision,s.doors,
          knownIntelRouteKey(s.intel));
      // A failed route is a stationary brace, not phantom walking speed.
      a.velocity=0;a.blockedTime+=dt;a.lastBlocker='route';
      a.recoveryAttempts++;
      a.retryRouteAt=s.seconds+routeRetrySeconds(a.recoveryAttempts);
      // Do not turn a failed route search into a new warning every
      // cooldown. A bounded escalation stays visible in the operator card.
      // The motor still probes periodically so a newly open path can heal.
      if(a.side==='blue'&&(a.recoveryAttempts===1||
         a.recoveryAttempts===5)){
        hooks.notify(s,a.name+(a.recoveryAttempts>=5?
          ' NO SAFE ROUTE · ORDERS RETAINED':' CANNOT REACH · RETRYING'));
        a.lastNavRepairAt=s.seconds;
      }
      return 'unavailable';
    }
    provisionalRouteAccepted(a);
  }

 return 'ready';
}
