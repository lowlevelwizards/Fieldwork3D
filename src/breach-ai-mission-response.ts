/** Mission identity may change a person's priorities, not their knowledge.
 * The session motor chooses and validates actual reachable destinations.
 */
import type {OperationKind} from './breach-operations.ts';
import type {EncounterRole} from './worldgen/encounter-types.ts';
export type MissionResponseFacts={
 mission:OperationKind;role:EncounterRole|undefined;
 confirmedSight:boolean;heardAlarm:boolean;hasEstimate:boolean;
 isAlreadyWithdrawing:boolean;secondsSinceAttempt:number;
};
export function captureTargetMayWithdraw(f:MissionResponseFacts):boolean{
 return f.mission==='capture'&&f.role==='target'&&
  !f.isAlreadyWithdrawing&&f.secondsSinceAttempt>=6&&
  f.hasEstimate&&(f.confirmedSight||f.heardAlarm);
}

/** Context changes defense priority, not world knowledge. An assigned
 * guard who actually hears danger near their post should not abandon it
 * just because another position is closer to the acoustic estimate. */
export type ObjectiveDefenseFacts={
 mission:OperationKind;role:EncounterRole|undefined;
 distanceToPost:number;distanceOfEvidenceToPost:number;
 heardActionableEvidence:boolean;directSight:boolean;
 suppression:number;
};
export function shouldProtectObjective(f:ObjectiveDefenseFacts):boolean{
 return (f.mission==='hold'||f.mission==='intel'||
         f.mission==='rescue'||f.mission==='capture')&&
   (f.role==='sentry'||f.role==='reserve'||f.role==='leader')&&
   f.distanceToPost<=140&&f.distanceOfEvidenceToPost<=240&&
   f.heardActionableEvidence&&!f.directSight&&f.suppression<.7;
}

/** Mission goal is assigned geography, never knowledge of hostile location.
 * The same personally heard cue can justify different defensive intentions.
 * World-safe cover and physical movement remain owned by the motor.
 */
export type ObjectiveResponse='hold-post'|'observe-approach'|'investigate';
export function missionObjectiveResponse(f:ObjectiveDefenseFacts):ObjectiveResponse{
 if(!f.heardActionableEvidence||f.directSight||f.suppression>=.7)
  return 'investigate';
 const assigned=f.role==='sentry'||f.role==='reserve'||f.role==='leader';
 if(!assigned)return 'investigate';
 if(f.mission==='hold'&&f.distanceToPost<=175&&
    f.distanceOfEvidenceToPost<=260)return 'hold-post';
 if(f.mission==='intel'&&f.distanceToPost<=135&&
    f.distanceOfEvidenceToPost<=190)return 'hold-post';
 if(f.mission==='rescue'&&f.distanceToPost<=120&&
    f.distanceOfEvidenceToPost<=190)return 'observe-approach';
 if(f.mission==='capture'&&f.distanceToPost<=140&&
    f.distanceOfEvidenceToPost<=220)return 'observe-approach';
 return 'investigate';
}
