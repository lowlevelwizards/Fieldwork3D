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
