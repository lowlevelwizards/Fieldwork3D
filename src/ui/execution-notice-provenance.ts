/** R6.3: presentation-only provenance for transient tactical warnings.
 * Exact active authored order, recent matching terminal failure, and Session
 * lifetime are supplied by the current friendly projection. Never inspect
 * hidden actors/world, infer success, or mutate authoritative events.
 */
import type {ExecutionNotice} from './execution-feedback.ts';

export type LiveNoticeActor=Readonly<{
 id:string;
 health?:number;
 plan:readonly Readonly<{id:number}>[];
 lastFailedOrder?:Readonly<{id:number;at:number}>|null;
}>;
export type LiveNoticeScope=Readonly<{
 session:object;
 actors:readonly LiveNoticeActor[];
 seconds:number;
 phase:string;
}>;

/** Events are immutable forensic facts; this helper governs ONLY banners. */
export function liveNoticeEligible(
 notice:ExecutionNotice,
 actors:readonly LiveNoticeActor[],
 seconds?:number,phase?:string
):boolean{
 if(notice.severity!=='warning')return true;
 const historical=/ENTRY INTERRUPTED|SQUAD ENTRY CANCELLED|ORDER CANCELLED|MOVE BLOCKED.*ORDER RETAINED|PATH BLOCKED.*ORDER RETAINED/;
 if(notice.origin!=='transition'){
  // Narrative text has no trusted order identity, and can be replayed by the
  // rolling-log overlap algorithm. Never turn it into an ongoing issue.
  if(historical.test(notice.text.toUpperCase()))return false;
  if(seconds!==undefined&&!actors.some(a=>a.health===undefined||
    a.health>0?!!a.plan[0]:false))return false;
  return true;
 }
 if(!notice.actorId)return false;
 const actor=actors.find(a=>a.id===notice.actorId);
 if(!actor||(actor.health!==undefined&&actor.health<=0))return false;
 if(notice.orderId!==undefined&&notice.orderId!==null){
  // The first PlanNode, not any later queued occurrence, is executing.
  return actor.plan[0]?.id===notice.orderId;
 }
 if(notice.reason!=='order-cancelled'||phase!=='running'||
    seconds===undefined||!Number.isFinite(seconds)||actor.plan.length)
  return false;
 const failed=actor.lastFailedOrder;
 if(!failed||notice.eventAt===undefined||
    !Number.isFinite(failed.at)||!Number.isFinite(notice.eventAt))return false;
 // A sparse transition is recorded after the real failure on the same
 // fixed tick; never match an unrelated earlier failure on this actor.
 if(Math.abs(failed.at-notice.eventAt)>1/60+1e-6)return false;
 const age=seconds-failed.at;
 return age>=-1e-6&&age<1.5;
}
