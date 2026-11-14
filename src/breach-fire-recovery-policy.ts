/** D2.3 — one fixed-tick ownership contract for a short gun-clearance
 * footstep. This is an interruption predicate, NOT a new motor, clock,
 * navigation state machine, or cached line-of-fire authorization.
 *
 * Physical travel is still done by the existing swept actor motor. The
 * previous correction only owns a transient waypoint until a higher-priority
 * authored/physical need, target change, or its existing lease interrupts.
 */
import type {TeamActor} from './breach-game.ts';

export type FireCorrectionStop='incapacitated'|'physical-action'|
 'authored-action'|'plan-changed'|'fire-policy'|'defensive-alarm'|
 'no-ammo'|'expired';

export function fireCorrectionStopReason(a:TeamActor,now:number,
 freshAlarm=false):FireCorrectionStop|null{
 if(a.health<=0||a.surrendered)return 'incapacitated';
 if(a.traversal||a.traversalPending||a.squeeze||a.carryingId||
    a.treatmentActive||a.reload>0||a.flashUntil>now||
    (a.doorStunUntil??0)>now||a.pace==='run')
  return 'physical-action';
 const n=a.plan[0];
 // This tiny scalar is captured on commitment, not polled from a rebuilt
 // plan signature. Older recordings without it fall back to kind checks.
 if(a.fireRetreatPlanId!==undefined&&
    a.fireRetreatPlanId!==(n?.id??null))return 'plan-changed';
 // Editing the SAME node (dragging its destination, changing action)
 // also invalidates the optional footstep with only primitive compares.
 if(a.fireRetreatPlanKind!==undefined&&
    a.fireRetreatPlanKind!==(n?.kind??null))return 'plan-changed';
 const original=a.fireRetreatPlanPoint;
 if(original&&(!n||n.p.x!==original.x||n.p.y!==original.y))
  return 'plan-changed';
 if(n?.moveMode==='sprint'||n&&
    !['move','look','wait'].includes(n.kind))
  return 'authored-action';
 if(a.side==='blue'&&(a.firePolicy==='hold'||
    a.firePolicy==='suppress'||a.firePolicy==='return'&&
      a.suppression<.10&&now-a.lastHitAt>3))
  return 'fire-policy';
 if(a.side==='red'&&(a.alert==='retreat'||freshAlarm||
    a.combatChoice==='withdraw'))return 'defensive-alarm';
 if(a.magazine<=0)return 'no-ammo';
 if(now>a.fireRetreatUntil)return 'expired';
 return null;
}

/** Clearing the transient route never edits the authored PlanNode array. */
export function cancelFireCorrection(a:TeamActor):void{
 a.fireRetreatTarget=null;
 a.fireRetreatReason=null;
 a.fireRetreatPlanId=null;
 a.fireRetreatContactId=null;
 a.fireRetreatPlanPoint=null;
 a.fireRetreatPlanKind=null;
 a.nav=[];
}

/** Detect target changes at the ALREADY-PAID visible target-selection phase.
 * Never issue a second LOS scan just to police an optional corrective step.
 * Legacy recordings without a contact token retain the bounded lease.
 */
export function correctionContactChanged(a:TeamActor,
 confirmedContactId:string|null):boolean{
 return !!a.fireRetreatTarget&&!!a.fireRetreatContactId&&
   a.fireRetreatContactId!==confirmedContactId;
}
