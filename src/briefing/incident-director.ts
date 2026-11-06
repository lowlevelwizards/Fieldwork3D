/** Seeded incident selection never mutates the resolved world. */
import {INCIDENTS,eligibleIncidents,isIncidentEligible} from './incident-catalog.ts';
import {briefingRng,mixBriefingSeed,weightedBriefingPick} from './briefing-seed.ts';
import type {IncidentDefinition,MissionTruth} from './briefing-types.ts';

export type IncidentSelection={
  narrativeSalt?:number;
  forceIncidentId?:string;
  recentIds?:readonly string[];
};
export function selectIncident(truth:MissionTruth,opts:IncidentSelection={}):IncidentDefinition{
  const pool=eligibleIncidents(truth);
  const requested=INCIDENTS.find(d=>d.id===opts.forceIncidentId);
  if(requested&&isIncidentEligible(truth,requested))return requested;
  const random=briefingRng(mixBriefingSeed(truth.seed,
    (opts.narrativeSalt??0)^0x1c79bb5e));
  // Recent history is a soft preference, NEVER an eligibility bypass.
  const chosen=weightedBriefingPick(pool,def=>{
    const recent=(opts.recentIds??[]).filter(id=>id===def.id).length;
    return def.weight*Math.pow(.38,recent);
  },random);
  // Extremely old study/practice sessions can lack a real rescue/capture target.
  // The fallback is still a truthful objective description.
  return chosen??INCIDENTS.find(d=>d.id==='generic-'+truth.missionKind)!;
}
