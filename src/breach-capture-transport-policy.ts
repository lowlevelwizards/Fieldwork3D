/** D15.5E: bounded eligibility for physically transporting the designated
 * downed CAPTURE target. This is a read-only permission, not custody itself.
 * The later GO-time EVACUATE action must still approach, acquire and advance
 * this exact TeamActor through the existing motor and collision authority.
 */
import type {TeamActor,Session} from './breach-game.ts';
import {captureVitalStatus} from './breach-capture-vitals.ts';
export type CaptureTransportMission=Pick<Session,'missionType'|'captureTarget'>;
export type CaptureTransportSubject=Pick<TeamActor,
 'id'|'side'|'health'|'carriedById'|'surrendered'|
 'medical'|'downedAt'|'deathAt'>;
export type CaptureTransportCarrier=Pick<TeamActor,
 'id'|'side'|'health'|'carryingId'>;
export function captureTargetTransportEligible(
 mission:CaptureTransportMission,subject:CaptureTransportSubject,
 carrier:CaptureTransportCarrier):boolean{
 return mission.missionType==='capture'&&
   mission.captureTarget===subject.id&&subject.side==='red'&&
   carrier.side==='blue'&&subject.health<=0&&carrier.health>0&&
   captureVitalStatus(subject)!=='deceased'&&
   (!subject.carriedById||subject.carriedById===carrier.id)&&
   (!carrier.carryingId||carrier.carryingId===subject.id);
}
/** A downed target is eligible for recovery, not automatically proven alive.
 * Medical outcomes and death-vs-incapacitation are adjudicated separately.
 */
export function designatedDownedCaptureTarget(
 mission:CaptureTransportMission,subject:CaptureTransportSubject):boolean{
 return mission.missionType==='capture'&&mission.captureTarget===subject.id&&
   subject.side==='red'&&subject.health<=0;
}
