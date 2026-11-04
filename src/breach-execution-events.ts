/** Sparse, replay-safe transitions for player-authored order execution.
 * Events describe only the friendly's observed motor and order, never
 * concealed enemies, inferred map geometry, or a tactical AI decision.
 */
import type {ExecutionStatus} from './breach-execution-state.ts';
export type ExecutionEventKind='started'|'waiting'|'recovering'|
 'blocked'|'resumed'|'completed'|'holding';
export type ExecutionEvent={
 id:number;t:number;actor:string;p:{x:number;y:number};
 orderId:number|null;kind:ExecutionEventKind;reason:string;text:string;
};
export function executionTransition(before:ExecutionStatus|null,
 after:ExecutionStatus,actorName:string):
 Pick<ExecutionEvent,'orderId'|'kind'|'reason'|'text'>|null{
 const key=(s:ExecutionStatus)=>
   s.kind+'|'+s.reason+'|'+s.orderId;
 if(before&&key(before)===key(after))return null;
 if(after.kind==='planned'||after.kind==='idle')return null;
 const orderId=after.orderId,reason=after.reason;
 let kind:ExecutionEventKind;
 if(after.kind==='blocked')kind='blocked';
 else if(after.kind==='recovering')kind='recovering';
 else if(after.kind==='waiting')kind='waiting';
 else if(after.kind==='holding')kind='holding';
 else if(after.kind==='complete')kind='completed';
 else if(before&&(before.kind==='blocked'||before.kind==='recovering'||
    before.kind==='waiting'||before.kind==='holding')&&
    before.orderId===after.orderId)kind='resumed';
 else kind='started';
 const detail=after.detail&&after.detail!==after.label?
   ' · '+after.detail:'';
 return {kind,reason,orderId,
   text:actorName+' '+(kind==='resumed'?'RESUMED':
    kind==='completed'?'ORDERS COMPLETE':after.label)+
    (kind==='completed'?'':detail)};
}
