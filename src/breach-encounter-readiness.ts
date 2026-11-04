/** Simulated reaction latency. Prepared guards still need to recognize
 * a contact; relaxed occupants require more time to act. */
import type {EncounterReadiness} from './worldgen/encounter-types.ts';
const base:Record<EncounterReadiness,number>={
 unaware:1.35,relaxed:.90,attentive:.52,suspicious:.34,
 alerted:.18,prepared:.09
};
export function encounterReactionDelay(readiness:EncounterReadiness,actorId:string):number{
 let hash=2166136261;
 for(let i=0;i<actorId.length;i++)
  hash=Math.imul(hash^actorId.charCodeAt(i),16777619);
 const jitter=(hash>>>0)%13/100;
 return base[readiness]+jitter;
}

/** Readiness affects how quickly an already geometrically visible shape is
 * recognized, never who is visible or the location of an unseen target.
 * Keep the range modest: first-shot latency still has its own reaction gate.
 */
export function perceptualReadiness(readiness:EncounterReadiness):number{
 switch(readiness){
  case 'unaware':return .78;
  case 'relaxed':return .88;
  case 'attentive':return 1;
  case 'suspicious':return 1.10;
  case 'alerted':return 1.18;
  case 'prepared':return 1.25;
 }
}
/** Fixed-step contact response: orientation before tactical action.
 * Never accelerates shooting or target recognition based on unseen truth.
 */
export type ReactionPhase='orient'|'ready'|'act';
export function encounterReactionPhase(now:number,startedAt:number|undefined,
 until:number|undefined):ReactionPhase{
 if(startedAt===undefined||until===undefined||!Number.isFinite(until))
  return 'act';
 if(now>=until)return 'act';
 const length=Math.max(.001,until-startedAt);
 return now-startedAt<Math.min(.38,length*.42)?'orient':'ready';
}
