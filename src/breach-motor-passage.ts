import {sessionWorldGeometry} from './breach-world-context.ts';
/** Stage 7: one narrow threshold claimant at a time. Schedules and
 * lease state are owned by the authoritative session, not new globals.
 */
import {OPERATOR_RADIUS,type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {passageWait,passageFollowerStep,passageScheduledStep,
 passageDeadlockRetreatTarget,type PassageActor}
 from './breach-passage.ts';
import {pendingPassageSlot} from './breach-passage-plan.ts';
import {sweptBodyClear,sweptProfileClear} from './breach-navigation.ts';
import {d,type ActorMotorHooks} from './breach-motor-contract.ts';

export function negotiateMotorPassage(
 a:TeamActor,p:Pt,initialMove:Pt,dt:number,s:Session,
 hooks:ActorMotorHooks):{paused:boolean;move:Pt}{
 let move=initialMove;
 const world=sessionWorldGeometry(s);
  // Resolve right-of-way BEFORE automatic door-opening, hinge pressure or
  // movement. Otherwise every teammate can start a competing OPEN action
  // and the planned squad sequence becomes unpredictable.
  // Only one operator owns a narrow threshold at a time. This is a
  // transient execution pause, not a new waypoint or permanent yield.
  const scheduled=hooks.ensurePassageSchedule(s);
  const traffic:PassageActor[]=s.operators.map(unit=>{
    const order=unit.plan[0];
    const traveling=!!order&&
      (order.kind==='move'||order.kind==='door'||
       order.kind==='pie'||order.kind==='sync')&&
      (unit.nav.length>0||d(unit.p,order.p)>7);
    return {
      id:unit.id,side:unit.side,p:unit.p,
      // Only the action happening NOW competes for a doorway. A future
      // movement after WAIT/RELOAD/etc. must not hold the reservation.
      // Crossing intent is the active route's real destination, not
      // today's tiny motor step. A stack-position MOVE on the same
      // side must remain free to finish before the coordinated SYNC.
      goal:unit===a?(unit.nav.at(-1)??order?.p??p):
        traveling?(unit.nav.at(-1)??order!.p):null,
      health:unit.health,blockedTime:unit.blockedTime,
      waitSeconds:unit.passageWaitSeconds,squeezing:unit.squeeze,
      active:unit===a||traveling,
      plannedPassage:pendingPassageSlot(unit.p,
        scheduled.get(unit.id),s.doors),
    };
  });
  const passageActor=traffic.find(unit=>unit.id===a.id)!;
  const sequencedMove=passageScheduledStep(passageActor,s.doors,traffic,
    move,(from,to)=>world.passable(to,OPERATOR_RADIUS)&&
      sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world));
  const negotiatedMove=passageFollowerStep(passageActor,s.doors,traffic,
    sequencedMove);
  // A partly free stride moves on this tick instead of stopping and
  // repeatedly re-accelerating. A fully consumed gap still enters the
  // existing WAIT state, with its unchanged warnings/lease semantics.
  const noForwardRoom=d(negotiatedMove,a.p)<.05&&d(move,a.p)>.05;
  if(passageWait(passageActor,s.doors,traffic,s.passageLeases,s.seconds,
       noForwardRoom?move:negotiatedMove)||noForwardRoom){
    a.motorPause='passage';a.velocity=0;a.blockedTime=0;
    a.passageWaitSeconds+=dt;
    // After both claimants have genuinely stalled, only the less-advanced
    // operator backs out. One candidate gets the lane; the other receives a
    // real, swept retreat route, not another simultaneous squeeze attempt.
    // Ordinary convoy pauses never qualify. Preserve authored orders.
    if(!a.traversal&&!a.traversalPending){
      const retreat=passageDeadlockRetreatTarget(
        {...passageActor,waitSeconds:a.passageWaitSeconds},
        s.doors,traffic,(from,to)=>sweptBodyClear(from,to,s.doors)||
          (a.squeeze&&sweptProfileClear(from,to,s.doors,
             a.squeezeYaw,'squeeze',world)));
      if(retreat){
        a.nav.unshift(retreat);a.passageWaitSeconds=0;
        a.retryRouteAt=0;a.recoveryAttempts=0;
        return {paused:true,move};
      }
    }
    // A normal stack is allowed to wait. Warn only when two or more
    // friendly operators have remained stalled in the same passage for
    // several seconds. Never reorder their independently authored plans.
    if(a.side==='blue'&&a.passageWaitSeconds>5.5&&
       !a.passageStallReported&&
       s.operators.some(other=>other!==a&&other.side===a.side&&
         other.health>0&&other.motorPause==='passage'&&
         other.passageWaitSeconds>3)){
      a.passageStallReported=true;
      hooks.notify(s,a.name+' PASSAGE STALLED · CHECK ROUTES');
    }
    return {paused:true,move};
  }
  a.passageWaitSeconds=0;a.passageStallReported=false;
  // Rendered locomotion uses real progress, not the unconstrained desired
  // speed. Prevent foot-skating when a convoy's available stride is short.
  if(d(negotiatedMove,a.p)<d(move,a.p)-.001)
    a.velocity=Math.min(a.velocity,d(negotiatedMove,a.p)/Math.max(dt,.0001));
  move=negotiatedMove;

 return {paused:false,move};
}
