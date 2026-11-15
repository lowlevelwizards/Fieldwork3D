import {setTransientRoute,noteDoorHandoffRejection} from './breach-route-transition.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
/** Fixed-clock transient route acquisition and backoff. This never
 * rewrites the player-authored PlanNode[] or grants collision authority.
 */
import {OPERATOR_RADIUS,doorLeafSegment,pointToSegment,type Pt}
 from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {pressDoorOnBodyAttempt} from './breach-door.ts';
import {sessionDoorPressurePolicy}
 from './breach-door-pressure-frame.ts';
import {recordDoorManeuverContact,tryGoalCompleteDoorHandoffAfterEscape}
 from './breach-door-traversal-maneuver.ts';
import {escapeOpenDoorOverlap,sweptBodyClear,bodyClear} from './breach-navigation.ts';
import {routeWithSqueezeIntel,routeWithSqueezeWorld,routeWithNormalWorld}
 from './breach-squeeze-route.ts';
import {diagnoseMovement} from './breach-nav-diagnostics.ts';
import {routeRetrySeconds} from './breach-movement-recovery.ts';
import {holdKnownFixedAuthoredGoal}
 from './breach-authored-goal-block.ts';
import {tryAutoClearClutter} from './breach-motor-clutter.ts';
import {d,clone,type ActorMotorHooks} from './breach-motor-contract.ts';
import {sweptRejoinExistingRoute,takeRepeatedDoorEscapeRoute,
 finishDoorEscapeRejoin} from './breach-door-escape-rejoin.ts';
import {joinedLocalOpenLeafStage} from './breach-door-escape-stage.ts';

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
 a.retryRouteAt=0;a.recoveryAttempts=0;
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
 if(!bodyClear(a.p,s.doors,OPERATOR_RADIUS,world))return false;
 const original=takeRepeatedDoorEscapeRoute(a,s.seconds,goal);
 if(!original)return false;
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
 if(!rejoined.length&&stageDoor&&
    pointToSegment(a.p,doorLeafSegment(stageDoor))<OPERATOR_RADIUS+44)
   rejoined=joinedLocalOpenLeafStage(a.p,goal,stageDoor,sweep,
     point=>bodyClear(point,s.doors,OPERATOR_RADIUS,world),
     (point,destination)=>routeWithSqueezeIntel(s.intel,point,destination));
 if(!rejoined.length||d(rejoined[rejoined.length-1],goal)>3)return false;
 setTransientRoute(s,a,rejoined,
   stageDoor&&rejoined.length&&d(rejoined[0],original[1]??goal)>1?
     'door-escape-local-portal':'door-escape-world-rejoin');
 finishDoorEscapeRejoin(a);
 a.lastNavRepairAt=s.seconds;a.retryRouteAt=0;a.recoveryAttempts=0;
 return true;
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
      a.retryRouteAt=0;a.recoveryAttempts=0;
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
    if(!a.nav.length){
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
    a.retryRouteAt=0;a.recoveryAttempts=0;
  }

 return 'ready';
}
