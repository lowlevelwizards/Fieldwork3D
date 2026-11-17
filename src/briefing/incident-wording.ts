/** D14.5: shared authored *reported* lead/context choice.
 * Reproduce B4 tactical briefing's exact seeded RNG sequence so the
 * Operations Room and mission briefing cannot disagree about report copy.
 * No site facts, disclosure levels or gameplay RNG are accessed.
 */
import type {IncidentDefinition} from './briefing-types.ts';
import {briefingRng,mixBriefingSeed} from './briefing-seed.ts';

export function selectAuthoredIncidentWording(
 incident:Pick<IncidentDefinition,'id'|'leads'|'contexts'>,
 seed:number,narrativeSalt=0
):Readonly<{narrativeSeed:number;lead:string;context:string;random:()=>number}>{
 const incidentHash=[...incident.id].reduce((n,ch)=>
  (Math.imul(n,33)+ch.charCodeAt(0))>>>0,5381);
 const narrativeSeed=mixBriefingSeed(seed,
  narrativeSalt^0x4b54a129^incidentHash);
 const random=briefingRng(narrativeSeed);
 const lead=incident.leads[Math.floor(random()*incident.leads.length)];
 const context=incident.contexts[Math.floor(random()*incident.contexts.length)];
 return {narrativeSeed,lead,context,random};
}
