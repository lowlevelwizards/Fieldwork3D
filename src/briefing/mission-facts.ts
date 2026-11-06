/** Read-only summary of the RESOLVED gameplay state. Never infer from a wishful narrative. */
import type {Session} from '../breach-game.ts';
import {operationBrief} from '../breach-operations.ts';
import type {MissionTruth} from './briefing-types.ts';

export function compileMissionFacts(
  s:Session,opts:{entryId?:string;contractRisk?:1|2|3}={}
):MissionTruth{
  const site=s.site,actors=s.operators.filter(a=>a.side==='red');
  const encounter=site?.encounter;
  const weapons={ordinary:0,security:0,prepared:0};
  for(const spec of encounter?.actors??[]){
    const profile=spec.weaponProfile??'ordinary';
    weapons[profile]++;
  }
  const risk=opts.contractRisk??encounter?.risk??1;
  const hasCapture=!!s.captureTarget&&actors.some(a=>a.id===s.captureTarget);
  const hasRescue=!!s.rescue||s.civilians.some(a=>a.rescueTarget);
  return {
    schema:1,seed:site?.seed??s.variant,missionKind:s.missionType,
    building:site?.archetype??'unknown',subtype:site?.identity?.subtype??null,
    siteName:site?.name??s.scenario.name,scale:site?.scale??'standard',
    propertyCondition:site?.identity?.condition??site?.condition??null,
    premise:encounter?.premise??'unknown',
    encounterProfile:encounter?.profile??'unknown',
    risk,riskFromContract:opts.contractRisk!==undefined,
    intelMode:s.intel.mode,roomCount:site?.rooms.length??0,
    hostileCount:actors.length,armedProfileCount:weapons,
    activeCivilianCount:s.civilians.filter(a=>!a.rescueTarget).length,
    rescueTargetPresent:hasRescue,captureTargetPresent:hasCapture,
    objective:operationBrief(s.missionType),entryId:opts.entryId??'FRONT'
  };
}
