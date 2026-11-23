/** UI-only current-order view. The authoritative executor and forensic
 * executionStatus remain unchanged, including real cancellation ledgers.
 * Only live player notices are dismissed when a command has advanced.
 */
import {executionStatus,type ExecutionActor,type ExecutionContext,
 type ExecutionStatus} from '../breach-execution-state.ts';
import type {ExecutionNotice} from './execution-feedback.ts';
import {liveNoticeEligible,type LiveNoticeActor} from './execution-notice-provenance.ts';

export function liveExecutionStatus(actor:ExecutionActor,
 context:ExecutionContext,seconds:number):ExecutionStatus{
 const original=executionStatus(actor,context);
 if(original.reason!=='entry-interrupted'&&
    original.reason!=='order-cancelled')return original;
 const last=actor.lastFailedOrder;
 if(!actor.plan.length&&last&&context.phase==='running'&&
    seconds>=last.at&&seconds-last.at<1.5)
   return {kind:'blocked',label:'ORDER FAILED',detail:last.reason,
     reason:'order-cancelled',orderId:null};
 // A completed earlier order is still recorded as failed in the actual
 // actor. The live status must describe the next/current order or IDLE;
 // never manufacture an "ORDERS COMPLETE" after a real cancellation.
 return executionStatus({...actor,interruptedDoorPlan:null,failedOrders:0,
   completedOrders:(actor.failedOrders??0)>0?0:actor.completedOrders},
   context);
}

export function liveExecutionNotice(
 notice:ExecutionNotice|null,
 currentOrders:readonly LiveNoticeActor[],
 seconds?:number,phase?:string
):ExecutionNotice|null{
 if(!notice)return null;
 return liveNoticeEligible(notice,currentOrders,seconds,phase)?notice:null;
}
