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
