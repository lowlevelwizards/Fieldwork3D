/** Build 22.06: a downed operator is not automatically confirmed dead.
 * Status is derived from combat health and wound treatment; no instant revive.
 */
import type {MedicalCondition} from './breach-medical-wounds.ts';
export type CasualtyCondition='fit'|'injured'|'heavy-wound'|'incapacitated'|'stabilized'|'critical';
export function casualtyCondition(health:number,stage:number,
 state:MedicalCondition):CasualtyCondition{
 if(health>0)return stage>=2?'heavy-wound':stage>=1?'injured':'fit';
 if(state.wounds.length===0)return 'incapacitated';
 if(state.bloodLoss>=2.8)return 'critical';
 const uncontrolled=state.wounds.some(w=>w.bleeding>0&&!w.stabilized);
 return uncontrolled?'critical':'stabilized';
}
export function stabilizationSummary(operators:readonly {
 id:string;health:number;injuryStage:number;medical:MedicalCondition
}[]){
 return {
  stabilized:operators.filter(o=>casualtyCondition(o.health,o.injuryStage,
   o.medical)==='stabilized').map(o=>o.id),
  critical:operators.filter(o=>casualtyCondition(o.health,o.injuryStage,
   o.medical)==='critical').map(o=>o.id)
 };
}
