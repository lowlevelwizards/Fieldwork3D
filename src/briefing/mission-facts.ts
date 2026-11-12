/** Read-only summary of the RESOLVED gameplay state. Never infer from a wishful narrative. */
import type {Session} from '../breach-game.ts';
import {operationBrief} from '../breach-operations.ts';
import {resolvedMissionPopulation} from '../breach-mission-semantics.ts';
import type {MissionTruth} from './briefing-types.ts';

export function compileMissionFacts(
  s:Session,opts:{entryId?:string;contractRisk?:1|2|3}={}
):MissionTruth{
  const site=s.site;
  const encounter=site?.encounter;
  const population=resolvedMissionPopulation(s);
  const risk=opts.contractRisk??encounter?.risk??1;
    return {
    schema:1,seed:site?.seed??s.variant,missionKind:s.missionType,
    building:site?.archetype??'unknown',subtype:site?.identity?.subtype??null,
    siteName:site?.name??s.scenario.name,scale:site?.scale??'standard',
    propertyCondition:site?.identity?.condition??site?.condition??null,
    premise:encounter?.premise??'unknown',
    encounterProfile:encounter?.profile??'unknown',
    risk,riskFromContract:opts.contractRisk!==undefined,
    intelMode:s.intel.mode,roomCount:site?.rooms.length??0,
    hostileCount:population.hostileCount,armedProfileCount:population.armedProfileCount,
    activeCivilianCount:population.activeCivilianCount,
    rescueTargetPresent:population.rescueTargetPresent,
    captureTargetPresent:population.captureTargetPresent,
    objective:operationBrief(s.missionType),entryId:opts.entryId??'FRONT',
    encounterIncidentId:encounter?.incidentIntentId??null
  };
}
