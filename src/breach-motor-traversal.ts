/** Stage 7: all attempted/active traversal follows the same fixed-tick
 * geometry and landing reservations. Never grants physical pass-through.
 */
import {WALLS,OPERATOR_RADIUS,passable,type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {routeWithSqueezeIntel,routeWithSqueezeWorld} from './breach-squeeze-route.ts';
import {probeWindowPortalRoute,canOpenWindowForClimb,
 probeObstacleCrossing,preferTraversal,traversalRouteLength,
 sampleTraversal,traversalStepClear} from './breach-mantle.ts';
import {manipulateWindow} from './breach-windows.ts';
import {d,clone,angle,type ActorMotorHooks} from './breach-motor-contract.ts';

export const motorTraversalWorld=(s:Session,a:TeamActor)=>({
 cover:s.coverState,walls:WALLS,doors:s.doors,windows:s.windows,
 // A teammate in the air already owns their landing. The next member of
 // the stack may approach, but must not launch into that reserved spot.
 actors:s.operators.filter(other=>other!==a&&other.health>0)
   .flatMap(o=>[o.p,...(o.traversal?[o.traversal.landing]:
     o.traversalPending?[o.traversalPending.landing]:[])]),
 canStand:(p:Pt)=>passable(p)
});
const traversalFitness=(a:TeamActor)=>({
 pace:a.pace,injury:Math.min(3,Math.max(0,a.injuryStage)) as 0|1|2|3,
 loadFactor:1/Math.max(.55,a.loadMovementScale??1)
});
/** This is a transient motor decision; it does not alter an authored order.
 * Only a known, individually climbable obstacle can win over a longer walk.
 */
function desiredTraverse(s:Session,a:TeamActor,goal:Pt){
 const world=motorTraversalWorld(s,a);
 const fit=traversalFitness(a);
 const ordinary=routeWithSqueezeIntel(s.intel,a.p,goal);
 const portal=probeWindowPortalRoute(a.p,goal,{
   ...world,
   windows:world.windows.map(w=>
     canOpenWindowForClimb(w)?{...w,open:true}:w)
 },(from,to)=>routeWithSqueezeWorld(from,to,s.doors),fit);
 if(portal&&s.intel.cover.has(portal.crossing.obstacleIndex)&&
     (!ordinary.length||portal.duration+.12<
      traversalRouteLength(a.p,ordinary)/53))
   return {op:portal.crossing,approachPath:portal.approachPath};
 // A distant waypoint is not an invalid vault intention. Probe the first
 // nearby obstacle on the authored direction, then keep the original goal.
 const span=d(a.p,goal);
 const probe=span>170?{x:a.p.x+(goal.x-a.p.x)*170/span,
   y:a.p.y+(goal.y-a.p.y)*170/span}:goal;
 const candidate=probeObstacleCrossing(a.p,probe,world,fit);
 const op=candidate?{...candidate,destination:clone(goal)}:null;
 if(!op||!s.intel.cover.has(op.obstacleIndex)||
    !preferTraversal(a.p,goal,op,ordinary))return null;
 const approachPath=routeWithSqueezeWorld(a.p,op.approach,s.doors);
 return approachPath.length?{op,approachPath}:
   d(a.p,op.approach)<3?{op,approachPath:[op.approach]}:null;
}
export function advanceMotorTraversal(a:TeamActor,s:Session,dt:number,hooks:ActorMotorHooks):boolean{
 const op=a.traversal;
 if(!op)return false;
 if(a.traversalRetreating&&a.traversalElapsed<=0){
   // Back on verified ground: keep the original MOVE order, then replan.
   a.traversal=null;a.traversalRetreating=false;
   a.traversalElevation=0;a.nav=[];a.velocity=0;
   a.lastTraversalAt=s.seconds;
   a.retryRouteAt=s.seconds+.65;
   a.blockedTime=0;
   if(a.side==='blue')hooks.notify(s,a.name+' TRAVERSAL BLOCKED · REPLANNING');
   return true;
 }
 if(!a.traversalRetreating&&a.traversalElapsed>=op.duration){
   // The final full-body landing was committed on the preceding tick.
   a.traversal=null;a.traversalElevation=0;a.nav=[];
   a.traversalRetreating=false;
   a.retryRouteAt=0;a.blockedTime=0;return true;
 }
 // An occupied landing or a changed door/obstacle stops the climb. After
 // half a second without forward progress, retrace the *same continuous
 // trajectory* instead of hanging in place or teleporting to the floor.
 if(a.blockedTime>.48)a.traversalRetreating=true;
 const nextElapsed=a.traversalRetreating?
   Math.max(0,a.traversalElapsed-dt*1.15):
   Math.min(op.duration,a.traversalElapsed+dt);
 const frame=sampleTraversal(op,nextElapsed);
 if(!traversalStepClear(a.p,frame.p,op,motorTraversalWorld(s,a))){
   a.velocity=0;a.blockedTime+=dt;
   a.lastBlocker='furniture';
   return true;
 }
 const old=clone(a.p);a.priorP=old;
 a.p=clone(frame.p);a.traversalElapsed=nextElapsed;
 a.traversalElevation=frame.elevation;
 a.velocity=d(old,a.p)/Math.max(dt,.0001);
 a.blockedTime=0;a.lastBlocker='clear';a.squeeze=false;
 // The weapon follows the actor during a vault, not a separate aim order.
 a.heading=angle(op.approach,op.landing);
 return true;
}

/** Runs before route construction. Return true only when this tick was
 * consumed by a pending launch, window interaction or rejected landing. */
export function prepareMotorTraversal(
 a:TeamActor,p:Pt,dt:number,s:Session,hooks:ActorMotorHooks):boolean{
  if(a.traversalPending&&d(a.p,a.traversalPending.approach)<3.3){
    const planned=a.traversalPending;
    if(planned.windowId){
      const pane=s.windows.find(w=>w.id===planned.windowId);
      if(!pane){a.traversalPending=null;a.nav=[];return true;}
      if(canOpenWindowForClimb(pane)){
        // A closed standard sash is an interaction, not an impossible
        // crossing. Pause at full-body clearance before opening it.
        a.velocity=0;a.actionTimer+=dt;
        if(a.actionTimer<.36)return true;
        a.actionTimer=0;
        if(manipulateWindow(pane,'open')){
          s.objectRevision++;
          hooks.hear(s,{x:pane.x,y:pane.y},85,'window');
          hooks.notify(s,a.name+' OPENED WINDOW');
          hooks.battleEvent(s,'interaction',a,a.p,a.name+' OPENED WINDOW');
        }
        return true;
      }
      if(!pane.open&&!pane.shattered){
        a.traversalPending=null;a.nav=[];a.actionTimer=0;
        a.lastTraversalAt=s.seconds;return true;
      }
    }
    const world=motorTraversalWorld(s,a);
    // Validate the LOCAL aperture, not the distant waypoint.
    // Window probes intentionally reject spans greater than 180 units.
    // The initial probe already selected an eligible obstacle and landing.
    // At takeoff, revalidate that exact crossing against CURRENT geometry,
    // pane state and all landing occupants. Re-probing from the approach
    // toward the distant authored goal can fail solely due to a changed
    // ray length and lose otherwise reliable vaults.
    const landingClear=!world.actors.some(position=>
      d(position,planned.landing)<OPERATOR_RADIUS*2+3);
    const verified=d(planned.approach,a.p)<4&&landingClear&&
      traversalStepClear(a.p,planned.landing,planned,world);
    if(verified){
      a.traversal={...planned,approach:clone(a.p)};
      a.traversalElapsed=0;a.traversalElevation=0;
      a.traversalRetreating=false;
      a.traversalPending=null;a.nav=[];a.velocity=0;
      a.blockedTime=0;a.lastTraversalAt=s.seconds;
      return true;
    }
    a.traversalPending=null;a.nav=[];a.lastTraversalAt=s.seconds;
    a.retryRouteAt=s.seconds+.30;
    return true;
  }
  if(!a.nav.length&&!a.traversalPending&&a.side==='blue'&&
     a.plan[0]?.kind==='move'&&
     s.seconds-a.lastTraversalAt>.55){
    const candidate=desiredTraverse(s,a,p);
    if(candidate){
      a.traversalPending=candidate.op;
      a.nav=candidate.approachPath;
      a.retryRouteAt=0;a.recoveryAttempts=0;
    }
  }

 return false;
}
