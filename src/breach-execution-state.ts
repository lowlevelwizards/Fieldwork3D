/** Read-only, player-safe interpretation of existing authoritative order/motor state.
 * This module NEVER mutates plans, chooses tactics, or reads enemy/world intel.
 * Keep mobile HUD, path markers and future replay on this same vocabulary.
 */
import type {PlanNode} from './breach-plan.ts';
import type {Blocker} from './breach-nav-diagnostics.ts';

export type ExecutionKind='idle'|'complete'|'moving'|'working'|
 'waiting'|'recovering'|'blocked'|'holding'|'planned';
export type MotorPause='passage'|'door-opening'|'door-held'|
 'door-locked'|'door-obstructed'|'window-clearance'|null;
export type ExecutionIssue={nodeId:number;reason:string;since:number};
export type ExecutionStatus={
 kind:ExecutionKind;label:string;detail:string;
 orderId:number|null;reason:string;progress?:number;
};
export type ExecutionActor={
 id:string;health:number;plan:readonly PlanNode[];
 activeNode:number;blockedTime:number;lastBlocker:Blocker;
 recoveryAttempts:number;velocity:number;waitRemaining:number;
 actionTimer:number;syncReady:string|null;
 traversal:{kind:string;duration:number}|null;
 traversalRetreating:boolean;traversalElapsed:number;
 motorPause:MotorPause;orderIssue:ExecutionIssue|null;
 completedOrders:number;
};
type Peer={health:number;syncReady:string|null;plan:readonly PlanNode[]};
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
 if(ctx.phase==='planning'&&n)
   return result('planned','PLANNED',n.kind.toUpperCase(),id,'planned');
 if(a.orderIssue&&n&&a.orderIssue.nodeId===n.id)
   return result('blocked','NEEDS ATTENTION',a.orderIssue.reason,id,'order-failed');
 if(a.traversalRetreating)
   return result('recovering','RECOVERING','TRAVERSAL RETREAT',id,'traversal');
 if(a.traversal)
   return result('working','TRAVERSING',a.traversal.kind.toUpperCase(),id,
     'traversal',a.traversalElapsed/Math.max(.001,a.traversal.duration));
 if(a.motorPause==='passage')
   return result('waiting','YIELDING','TEAMMATE AT PASSAGE',id,'traffic');
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
   return result(hard?'blocked':'recovering',
     hard?'BLOCKED':'RECOVERING',a.lastBlocker.toUpperCase(),id,
     'collision-'+a.lastBlocker);
 }
 if(!n)return result(a.completedOrders>0?'complete':'idle',
   a.completedOrders>0?'ORDERS COMPLETE':'IDLE',
   a.completedOrders>0?'AWAITING YOUR PLAN':'NO ACTIVE ORDERS',
   null,a.completedOrders>0?'complete':'idle');
 if(n.kind==='wait'||n.kind==='holdClear'){
   if(n.doorId){
     const door=ctx.doors?.find(d=>d.id===n.doorId);
     const ready=!!door?.open&&(door.openFraction??1)>=.72;
     if(!ready)return result(a.actionTimer>=2.5?'blocked':'waiting',
       a.actionTimer>=2.5?'ENTRY BLOCKED':'WAITING',
       door?'DOOR NOT CLEAR':'DOOR UNAVAILABLE',id,'entry-gate');
   }
   const duration=n.duration??.5;
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
   return result('waiting','SYNC '+code,
     peers.length?ready+'/'+peers.length+' READY':'WAITING FOR SYNC',
     id,'sync');
 }
 if(n.kind==='move'||n.kind==='pie'){
   if(a.velocity<.2&&a.activeNode===n.id&&a.blockedTime>.2)
     return result('recovering','RECOVERING','MOVEMENT INTERRUPTED',id,'movement');
   return result('moving','MOVING',n.kind==='move'?'TO WAYPOINT':'ALONG ARC',
     id,'move');
 }
 if(n.kind==='door'||n.kind==='tool'||n.kind==='interact'||
    n.kind==='flash'||n.kind==='reload'||n.kind==='treat'||
    n.kind==='recover-medical'||n.kind==='evacuate')
   return result('working',n.kind==='door'?'DOOR':n.kind==='tool'?'TOOL':
      n.kind==='recover-medical'?'RECOVERING KIT':n.kind.toUpperCase(),
     n.kind==='door'?(n.method??'open').toUpperCase():
      n.kind==='tool'?(n.toolMethod??'USE TOOL').toUpperCase():
      'IN PROGRESS',id,n.kind);
 return result('working','EXECUTING',n.kind.toUpperCase(),id,n.kind);
}
