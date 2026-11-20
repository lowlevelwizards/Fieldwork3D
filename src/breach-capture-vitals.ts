/** D15.7: mission-local clinical evidence. Gameplay states, not medical advice.
 *
 * Old recordings and manually downed actors have no authoritative down
 * evidence; do not silently convert those unknowns into a living prisoner.
 * Live shot and uncontrolled-bleeding down events stamp the same source.
 * Death is an irreversible explicit fixed-tick event from *recorded ongoing
 * blood loss*, not from zero health, gun caliber or renderer pose.
 */
import type {TeamActor} from './breach-game.ts';
import {advanceMedicalCondition,bleedingRate,type MedicalCondition}
 from './breach-medical-wounds.ts';
export const FATAL_BLOOD_LOSS=4;
export const CAPTURE_VITAL_CHECK_SECONDS=.9;
export type CaptureVitalStatus=
 'conscious'|'critical'|'incapacitated'|'stabilized'|'deceased'|'unverified';
export type VitalFacts=Readonly<{
 health:number;medical:MedicalCondition;
 downedAt?:number|null;deathAt?:number|null;
}>;
export function captureVitalStatus(a:VitalFacts):CaptureVitalStatus{
 if(a.deathAt!=null&&Number.isFinite(a.deathAt))return 'deceased';
 if(a.health>0)return 'conscious';
 if(a.downedAt==null||!Number.isFinite(a.downedAt))return 'unverified';
 if(bleedingRate(a.medical)>0)return 'critical';
 return a.medical.wounds.some(w=>w.stabilized)?'stabilized':'incapacitated';
}
export const livingCaptureStatus=(s:CaptureVitalStatus):boolean=>
 s==='conscious'||s==='critical'||s==='incapacitated'||s==='stabilized';
/** Explicitly recorded real down from shot, deterioration or on-site
 * vital assessment. The first down time and hit contributor are durable.
 */
export function recordActualDown(a:TeamActor,now:number,
 creditedTo?:string|null):void{
 if(a.health>0||a.deathAt!=null)return;
 if(a.downedAt==null)a.downedAt=now;
 if(creditedTo!==undefined)a.lastDownById=creditedTo;
}
/** Downed subjects keep bleeding. Stabilizing every active wound freezes
 * this clock, but never resurrects a dead actor or heals a health point.
 * `advanceMedicalCondition` already clamps dt to the fixed-tick budget.
 */
export function advanceDownedVitals(a:TeamActor,dt:number,now:number):boolean{
 if(a.health>0||a.deathAt!=null||a.downedAt==null)return false;
 if(bleedingRate(a.medical)<=0)return false;
 advanceMedicalCondition(a.medical,dt);
 if(a.medical.bloodLoss<FATAL_BLOOD_LOSS)return false;
 a.deathAt=now;
 a.escortLeaderId=null;a.escortGoal=null;
 a.suspectEscapeMode=null;a.suspectEscapeGoal=null;
 a.velocity=0;a.nav=[];a.plan=[];
 return true;
}
