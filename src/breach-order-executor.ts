import {sessionWorldGeometry} from './breach-world-context.ts';
import {fireCorrectionStopReason,cancelFireCorrection}
 from './breach-fire-recovery-policy.ts';
/** Stage 8: one fixed-tick tactical order dispatcher.
 * Branch priority is exactly the former breach-game.runOrders priority:
 * traversal -> defensive movement -> contact -> node activation -> special
 * interactions -> movement/aim -> wait/sync/reload/flash -> door.
 * The engine still owns the authoritative step and all world effects.
 */
import type {Session,TeamActor} from './breach-game.ts';
import {type Pt} from './breach-core.ts';
import {bodyClear,sweptBodyClear} from './breach-navigation.ts';
import {dropCivilianCustody} from './breach-civilian-transport.ts';
import {advanceWaitOrder} from './breach-order-wait.ts';
import {executeTacticalUtilityOrder,type UtilityOrderHooks}
 from './breach-order-utility.ts';
import {beginOrder,completeOrder,rotate,aimHeading,
 failCurrentOrder,clearCurrentOrderIssue} from './breach-order-lifecycle.ts';
import {createEntryOrderHandler} from './breach-order-entry.ts';
import {createMedicalOrderHandler} from './breach-order-medical.ts';
import {createInteractionOrderHandler} from './breach-order-interactions.ts';
import {createMovementOrderHandler} from './breach-order-movement.ts';
import {createDoorOrderHandler} from './breach-order-door.ts';
import {targetAngle} from './breach-plan.ts';
import type {OrderExecutionPort} from './breach-order-execution-port.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const angle=(a:Pt,b:Pt)=>targetAngle(a,b);
export function createOrderExecutor(port:OrderExecutionPort){
 const executeEntryOrder=createEntryOrderHandler(port);
 const executeMedicalOrder=createMedicalOrderHandler(port);
 const executeInteractionOrder=createInteractionOrderHandler(port);
 const executeMovementOrder=createMovementOrderHandler(port);
 const executeDoorOrder=createDoorOrderHandler(port);
 const utilityHooks:UtilityOrderHooks={
   pop:completeOrder,notify:port.notify,beginReload:port.beginReload,
   fail:(s,a,n,reason)=>failCurrentOrder(s,a,n,reason,port.notify),
   clearIssue:clearCurrentOrderIssue,rotate,battleEvent:port.battleEvent
 };
 return function runOrders(s:Session,a:TeamActor,dt:number,
  profile?:((section:string,elapsedMs:number)=>void)):void{
  // Player-authored positions are sacred. Traffic steering only moves the
  // actor who requested movement, never a stationary friend or held stack.
  const n=a.plan[0];
  a.motorPause=null;
  // An airborne crossing must reach a verified landing before combat pause,
  // waypoint completion, or fresh orders can resume.
  if(a.traversal){
   const start=profile?performance.now():0;
   port.advanceTraversal(a,s,dt);
   if(profile)profile('traversal',performance.now()-start);
   return;
  }
  // A short, validated muzzle-clearance step never edits the player's plan.
  // Complete or expire it before resuming the original waypoint motor.
  if(a.fireRetreatTarget){
    const goal=a.fireRetreatTarget;
    // Higher-priority player actions and edited orders cancel optional
    // footwork BEFORE any swept geometry test or route acquisition.
    if(fireCorrectionStopReason(a,s.seconds)||d(a.p,goal)<.9||
       !sweptBodyClear(a.p,goal,s.doors,8,sessionWorldGeometry(s))){
      cancelFireCorrection(a);
    }else{
      port.approach(a,goal,dt,s,.64);
      return;
    }
  }
  // A confirmed visible threat can temporarily interrupt authored attention.
  // This is reactive execution only; it never modifies the player's plan.
  const threatStart=profile?performance.now():0;
  // An allocation-free scan preserves filter order, exact Euclidean
  // ranking and the original roster-order tie break of stable Array.sort.
  // Still evaluate each living red's confirmed sight exactly once.
  let visibleThreat:TeamActor|undefined,nearestDistance=Infinity;
  for(const e of s.operators){
    if(e.side!=='red'||e.health<=0||!port.inSight(a,e,s))continue;
    const distance=d(a.p,e.p);
    if(!visibleThreat||distance<nearestDistance){
      visibleThreat=e;nearestDistance=distance;
    }
  }
  if(profile)profile('threat-scan',performance.now()-threatStart);
  const orderStart=profile?performance.now():0;
  // One measured scope encloses every early return from authored-order
  // execution. It reports elapsed order CPU without editing a plan or
  // interrupting traversal, collision, or door decisions.
  try{
  if(a.carryingId&&
     (n?.kind!=='evacuate'||n.patientId!==a.carryingId)&&
     (n?.interaction!=='release-civilian'||n.objectId!==a.carryingId)){
    const civil=s.civilians.find(c=>c.id===a.carryingId);
    if(civil)dropCivilianCustody(civil,a);
    else {
      const prior=s.operators.find(o=>o.id===a.carryingId);
      if(prior)prior.carriedById=null;
      a.carryingId=null;
    }
  }
  if(a.haltOnContact){
    const threat=visibleThreat;
    if(threat){
      a.motorPause='contact';
      a.velocity=0;rotate(a,angle(a.p,threat.p),dt,s);return;
    }
  }
  if(!n||a.health<=0){
    if(a.squeeze&&bodyClear(a.p,s.doors)){
      a.squeeze=false;a.squeezeTime=0;
    }
    a.velocity=Math.max(0,a.velocity-dt*160);
    const held=visibleThreat?angle(a.p,visibleThreat.p):aimHeading(a);
    if(a.health>0&&held!==null)rotate(a,held,dt,s);
    return;
  }
  beginOrder(a,n,s.doors);

   if(executeEntryOrder(s,a,n,dt))return;
   if(executeMedicalOrder(s,a,n,dt))return;
   if(executeInteractionOrder(s,a,n,dt))return;
   if(executeMovementOrder(s,a,n,dt,visibleThreat,profile))return;
   if(n.kind==='holdClear'||n.kind==='wait'){
     advanceWaitOrder(s,a,n,dt,port.inSight,port.notify,completeOrder);return;
   }
   if(executeTacticalUtilityOrder(s,a,n,dt,utilityHooks))return;
   executeDoorOrder(s,a,n,dt);
  }finally{
   if(profile)profile('orders',performance.now()-orderStart);
  }
 };
}
