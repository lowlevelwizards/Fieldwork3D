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
