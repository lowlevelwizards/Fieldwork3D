/** Read-only, player-safe interpretation of existing authoritative order/motor state.
 * This module NEVER mutates plans, chooses tactics, or reads enemy/world intel.
 * Keep mobile HUD, path markers and future replay on this same vocabulary.
 */
import type {PlanNode} from './breach-plan.ts';
import type {Blocker} from './breach-nav-diagnostics.ts';

export type ExecutionKind='idle'|'complete'|'moving'|'working'|
 'waiting'|'recovering'|'blocked'|'holding'|'planned';
export type MotorPause='passage'|'contact'|'door-opening'|'door-held'|
 'door-locked'|'door-obstructed'|'window-clearance'|null;
export type ExecutionIssue={nodeId:number;reason:string;since:number};
export type ExecutionStatus={
 kind:ExecutionKind;label:string;detail:string;
 orderId:number|null;reason:string;progress?:number;
 /** Optional named teammate, displayed by the HUD without changing the
  * established executionStatus.detail API or hidden-world information. */
 waitingFor?:string;
};
export type ExecutionActor={
 id:string;health:number;plan:readonly PlanNode[];
 activeNode:number;blockedTime:number;lastBlocker:Blocker;
 recoveryAttempts:number;velocity:number;waitRemaining:number;
 actionTimer:number;syncReady:string|null;
 traversal:{kind:string;duration:number}|null;
 traversalRetreating:boolean;traversalElapsed:number;
 motorPause:MotorPause;orderIssue:ExecutionIssue|null;
 completedOrders:number;failedOrders?:number;
 lastFailedOrder?:{id:number;kind:string;reason:string;at:number}|null;
 passageWaitSeconds?:number;
 /** A historical door incident, not a current lock-state query. */
 interruptedDoorPlan?:{doorId:string|null;reason:'locked'|'jammed'|'coordinated';at:number}|null;
};
type Peer={id?:string;health:number;syncReady:string|null;plan:readonly PlanNode[]};
type DoorView={id:string;open:boolean;openFraction?:number};
export type ExecutionContext={
 phase?:'planning'|'running'|'won'|'lost';
 doors?:readonly DoorView[];peers?:readonly Peer[];
};
const result=(kind:ExecutionKind,label:string,detail:string,
 orderId:number|null,reason:string,progress?:number):ExecutionStatus=>({
 kind,label,detail,orderId,reason,
 ...(progress===undefined?{}:{progress:Math.max(0,Math.min(1,progress))})
});
export function executionStatus(a:ExecutionActor,ctx:ExecutionContext={}):ExecutionStatus{
 const n=a.plan[0],id=n?.id??null;
 if(a.health<=0)return result('idle','DOWN','INCAPACITATED',null,'down');
 if(a.orderIssue&&n&&a.orderIssue.nodeId===n.id)
   return result('blocked','NEEDS ATTENTION',a.orderIssue.reason,id,'order-failed');
 if(a.interruptedDoorPlan&&(ctx.phase==='planning'||!n))
   return result('blocked','ENTRY INTERRUPTED',
     a.interruptedDoorPlan.reason==='coordinated'?
       'SQUAD ENTRY HELD · REPLAN WHEN CLEAR':
       'FAILED ENTRY · REPLAN WHEN CLEAR',
     id,'entry-interrupted');
 if(ctx.phase==='planning'&&n)
   return result('planned','PLANNED',n.kind.toUpperCase(),id,'planned');
 if(a.traversalRetreating)
   return result('recovering','RECOVERING','TRAVERSAL RETREAT',id,'traversal');
 if(a.traversal)
   return result('working','TRAVERSING',a.traversal.kind.toUpperCase(),id,
     'traversal',a.traversalElapsed/Math.max(.001,a.traversal.duration));
 if(a.motorPause==='contact')
   return result('holding','CONTACT HOLD','CONFIRMED CONTACT',id,'contact');
 if(a.motorPause==='passage'){
   const prolonged=(a.passageWaitSeconds??0)>5.5;
   return result(prolonged?'blocked':'waiting',
     prolonged?'TRAFFIC STALLED':'YIELDING',
     prolonged?'CHECK SQUAD ROUTES':'TEAMMATE AT PASSAGE',id,
     prolonged?'traffic-stall':'traffic');
 }
 if(a.motorPause==='door-opening')
   return result('waiting','WAITING','DOOR OPENING',id,'door-opening');
 if(a.motorPause==='door-held'||a.motorPause==='door-locked'||
    a.motorPause==='door-obstructed')
   return result('blocked','DOOR BLOCKED',
     a.motorPause.replace('door-','').toUpperCase(),id,a.motorPause);
 if(a.motorPause==='window-clearance')
   return result('waiting','WAITING','WINDOW LANDING OCCUPIED',id,'window');
 if(n&&a.blockedTime>=.85&&a.lastBlocker!=='clear'){
   const hard=a.blockedTime>=3.5||a.recoveryAttempts>=5;
   const reason='collision-'+a.lastBlocker;
   // Only the operator's actually observed motor blocker is exposed.
   // An unreachable route does not disclose hidden furniture or walls.
   const label=a.lastBlocker==='route'?'ROUTE UNAVAILABLE':
     a.lastBlocker==='door'?'DOOR OBSTRUCTED':
     a.lastBlocker==='furniture'?'MOVEMENT OBSTRUCTED':
     a.lastBlocker==='wall'?'WALL OBSTRUCTION':'BLOCKED';
   const detail=a.lastBlocker==='route'?'ORDERS RETAINED':
     a.lastBlocker==='door'?'CHECK DOOR CLEARANCE':
     a.lastBlocker==='furniture'?'CHECK VISIBLE COVER':
     a.lastBlocker==='wall'?'CHECK CLEAR ROUTE':
     a.lastBlocker.toUpperCase();
   return result(hard?'blocked':'recovering',
     hard?label:'RECOVERING',detail,id,reason);
 }
 if(!n){
   // Never render an exhausted queue as successful when its authorial
   // orders were discarded after a witnessed terminal failure. Active
   // actions and ordinary idle actors keep their existing state.
   const failed=a.failedOrders??0;
   if(failed>0)return result('blocked','ORDERS CANCELLED',
     failed+' FAILED · '+(a.lastFailedOrder?.reason??'SEE EVENT LOG'),
     null,'order-cancelled');
   return result(a.completedOrders>0?'complete':'idle',
     a.completedOrders>0?'ORDERS COMPLETE':'IDLE',
     a.completedOrders>0?'AWAITING YOUR PLAN':'NO ACTIVE ORDERS',
     null,a.completedOrders>0?'complete':'idle');
 }
 if(n.kind==='wait'||n.kind==='holdClear'){
   if(n.doorId){
     const door=ctx.doors?.find(d=>d.id===n.doorId);
     const ready=!!door?.open&&(door.openFraction??1)>=.72;
     if(!ready){
       // A generated gate has no right to invent clearance. Distinguish
       // known lock/brace/jam from a normal temporary swing or lead entry.
       // Derive from the same door state as simulation, with no extra HUD
       // polling, order mutation or undisclosed geometry probes.
       // Locked/held/jammed are *not* safe to infer from world-truth
       // Door data: only the actor's motorPause or orderIssue may report
       // those conditions after the physical interaction exposes them.
       const blocked=!door||a.actionTimer>=2.5;
       const detail=!door?'DOOR UNAVAILABLE':
         door.open?'DOOR SWING NOT CLEAR':'DOOR NOT CLEAR';
       return result(blocked?'blocked':'waiting',
        blocked?'ENTRY BLOCKED':'WAITING',detail,id,'entry-gate');
     }
   }
   const duration=n.duration??(n.kind==='wait'?1:.5);
   return result('waiting','WAIT',a.waitRemaining===0&&a.actionTimer>0?
     'CONTACT HOLD':'TIMED WAIT',id,'wait',
     Math.min(1,a.waitRemaining/Math.max(.001,duration)));
 }
 if(n.kind==='sync'){
   const code=n.syncCode??'A';
   const peers=(ctx.peers??[]).filter(p=>p.health>0&&
     (p.syncReady===code||p.plan.some(order=>
       order.kind==='sync'&&order.syncCode===code)));
   const ready=peers.filter(p=>p.syncReady===code).length;
   const waiting=peers.find(p=>p.syncReady!==code);
   const status=result('waiting','SYNC '+code,
     peers.length?ready+'/'+peers.length+' READY':'WAITING FOR SYNC',
     id,'sync');
   return waiting?.id?{...status,waitingFor:waiting.id}:status;
 }
 if(n.kind==='move'||n.kind==='pie'){
   if(a.velocity<.2&&a.activeNode===n.id&&a.blockedTime>.2)
     return result('recovering','RECOVERING','MOVEMENT INTERRUPTED',id,'movement');
   return result('moving','MOVING',n.kind==='move'?'TO WAYPOINT':'ALONG ARC',
     id,'move');
 }
 if(n.kind==='door'){
   const door=ctx.doors?.find(d=>d.id===n.doorId);
   if(n.method==='open'&&door?.open&&(door.openFraction??1)<.72)
     return result('waiting','DOOR SWINGING','WAITING FOR CLEARANCE',
       id,'door-swing',(door.openFraction??0)/.72);
   return result('working','DOOR',(n.method??'open').toUpperCase(),
     id,'door',n.method==='open'||n.method==='close'?
       a.actionTimer/(n.method==='close'?.75:.78):undefined);
 }
 if(n.kind==='tool'||n.kind==='interact'||
    n.kind==='flash'||n.kind==='reload'||n.kind==='treat'||
    n.kind==='recover-medical'||n.kind==='evacuate')
   return result('working',n.kind==='tool'?'TOOL':
      n.kind==='recover-medical'?'RECOVERING KIT':n.kind.toUpperCase(),
      n.kind==='tool'?(n.toolMethod??'USE TOOL').toUpperCase():
      'IN PROGRESS',id,n.kind);
 return result('working','EXECUTING',n.kind.toUpperCase(),id,n.kind);
}
