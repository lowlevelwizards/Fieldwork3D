/** Q2: one cached, threshold-relative right-of-way decision.
 * Queue waits never synthesize lateral/backward movement or reroute.
 * True counterflow deadlocks alone can use the pre-existing bounded,
 * fully swept physical retreat, without rewriting the authored goal.
 */
import {type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {coordinatePassage} from './breach-passage-coordinator.ts';
import {passageDeadlockRetreatTarget,type PassageActor} from './breach-passage.ts';
import {sweptBodyClear,sweptProfileClear} from './breach-navigation.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {noteQueueMotion} from './breach-queue-trace.ts';
import {d,type ActorMotorHooks} from './breach-motor-contract.ts';
export function negotiateMotorPassage(
 a:TeamActor,p:Pt,initialMove:Pt,dt:number,s:Session,
 hooks:ActorMotorHooks):{paused:boolean;move:Pt}{
 const decision=coordinatePassage(s,a,p,initialMove,
  hooks.ensurePassageSchedule(s));
 if(decision.hold){
  a.motorPause='passage';a.velocity=0;a.blockedTime=0;
  a.passageWaitSeconds+=dt;
  // Exactly one actual, opposition-only retreat per authored goal.
  // Ordinary rank/spacing waits NEVER propose reverse movement.
  if(decision.reason==='opposing'&&a.passageWaitSeconds>=1.25&&
     !a.traversal&&!a.traversalPending){
    const retreatKey=(a.plan[0]?.id??'motor')+':'+a.routeGoalKey;
    if(a.passageRetreatKey!==retreatKey){
     const traffic:PassageActor[]=s.operators.map(unit=>{
      const order=unit.plan[0];
      const traveling=!!order&&
        (order.kind==='move'||order.kind==='pie')&&
        (unit.nav.length>0||d(unit.p,order.p)>7);
      return {id:unit.id,p:unit.p,side:unit.side,
       goal:traveling?(unit.nav.at(-1)??order!.p):null,
       health:unit.health,blockedTime:unit.blockedTime,
       active:traveling,waitSeconds:unit.passageWaitSeconds};
     });
     const target=passageDeadlockRetreatTarget(
      {...traffic.find(unit=>unit.id===a.id)!,waitSeconds:a.passageWaitSeconds},
      s.doors,traffic,(from,to)=>sweptBodyClear(from,to,s.doors,8,sessionWorldGeometry(s))||
        (a.squeeze&&sweptProfileClear(from,to,s.doors,
         a.squeezeYaw,'squeeze',sessionWorldGeometry(s))));
     if(target){
      noteQueueMotion(s,a,'deadlock-retreat-request',a.p,target);
      const retreat=target;
      a.nav.unshift(retreat);a.passageRetreatKey=retreatKey;
      a.retryRouteAt=0;a.recoveryAttempts=0;
      a.passageWaitSeconds=0;
     }
    }
  }
  if(a.passageWaitSeconds>5.5&&!a.passageStallReported&&
     s.operators.some(other=>other!==a&&other.side===a.side&&
      other.health>0&&other.motorPause==='passage'&&
      other.passageWaitSeconds>3)){
   a.passageStallReported=true;
   hooks.notify(s,a.name+' PASSAGE STALLED · CHECK ROUTES');
  }
  return {paused:true,move:initialMove};
 }
 a.passageWaitSeconds=0;a.passageStallReported=false;
 if(a.motorPause==='passage')a.motorPause=null;
 if(d(decision.move,a.p)<d(initialMove,a.p)-.001)
  a.velocity=Math.min(a.velocity,d(decision.move,a.p)/Math.max(dt,.0001));
 return {paused:false,move:decision.move};
}
