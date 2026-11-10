import {sessionWorldGeometry} from './breach-world-context.ts';
/** Fixed-clock transient route acquisition and backoff. This never
 * rewrites the player-authored PlanNode[] or grants collision authority.
 */
import {OPERATOR_RADIUS,type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {pressDoorOnBodyAttempt} from './breach-door.ts';
import {incidentalCloseWouldBlockTeammate}
 from './breach-door-pressure-arbitration.ts';
import {escapeOpenDoorOverlap} from './breach-navigation.ts';
import {routeWithSqueezeIntel,routeWithSqueezeWorld}
 from './breach-squeeze-route.ts';
import {diagnoseMovement} from './breach-nav-diagnostics.ts';
import {routeRetrySeconds} from './breach-movement-recovery.ts';
import {tryAutoClearClutter} from './breach-motor-clutter.ts';
import {d,clone,type ActorMotorHooks} from './breach-motor-contract.ts';

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
    // A hinge from an earlier state can leave the operator embedded in its
    // collision capsule. Take a bounded real swept step out before route
    // backoff; do not demand a new waypoint or let the route fail forever.
    const escape=escapeOpenDoorOverlap(a.p,p,s.doors,dt*45,sessionWorldGeometry(s));
    if(escape){
      a.priorP=clone(a.p);a.p=escape;a.velocity=0;
      a.blockedTime=0;a.lastBlocker='door';
      a.retryRouteAt=0;return 'handled';
    }
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
      pressDoorOnBodyAttempt(a.p,probe,s.doors,dt,
        s.operators.filter(o=>o.health>0).map(o=>o.p),{
          deferClosing:door=>incidentalCloseWouldBlockTeammate(s.operators,a,door)
        },sessionWorldGeometry(s));
    }
    // When two chairs interlock there may be no navigable path, so the
    // ordinary collision branch cannot run. Probe only a real, short
    // goal-directed body step; no furniture may be shifted at a distance.
    if(a.side==='blue'&&a.plan[0]?.kind==='move'&&
       s.seconds-a.lastAutoShoveAt>.38&&goalDistance>2){
      const distance=Math.min(4,goalDistance);
      const contactProbe={x:a.p.x+(p.x-a.p.x)/goalDistance*distance,
        y:a.p.y+(p.y-a.p.y)/goalDistance*distance};
      if(diagnoseMovement(a.p,contactProbe,s.doors).blocker==='furniture'&&
         tryAutoClearClutter(s,a,contactProbe,hooks))return 'handled';
    }
    if(s.seconds<a.retryRouteAt){a.velocity=0;return 'unavailable';}
    a.nav=a.side==='blue'?routeWithSqueezeIntel(s.intel,a.p,p):
      hooks.cachedEnemyRoute(s,a.p,p,true);
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
          a.nav=[...path,p];
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
