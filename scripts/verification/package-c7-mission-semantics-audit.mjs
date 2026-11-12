/** C7 on-demand semantic gate; bounded seeded real-world survey.
 * This never rewrites, rescales, or re-runs an existing player's site.
 */
import {generateSite} from '../../src/breach-site.ts';
import {newSession} from '../../src/breach-game.ts';
import {activateSite} from '../../src/breach-core.ts';
import {auditMissionScenario,resolvedMissionPopulation}
 from '../../src/breach-mission-semantics.ts';
import {missionForSeed} from '../../src/breach-operations.ts';

const seeds=[2,3,4,9,17,23];
const rows=[];
try{
 for(const seed of seeds){
  const site=generateSite(seed,'small');
  const issues=auditMissionScenario(site).filter(x=>x.severity==='error');
  const session=newSession(0,seed,'floor-plan','small',undefined,site,
   {enableCivilians:true});
  const population=resolvedMissionPopulation(session);
  const valid=issues.length===0&&
   site.encounter?.mission===missionForSeed(seed)&&
   session.missionType===site.encounter?.mission&&
   population.hostileCount===site.encounter?.actors.length&&
   population.activeCivilianCount===(site.encounter?.neutrals?.length??0)&&
   (session.missionType!=='capture'||population.captureTargetPresent)&&
   (session.missionType!=='rescue'||population.rescueTargetPresent);
  rows.push({seed,mission:session.missionType,
   hostiles:population.hostileCount,civilians:population.activeCivilianCount,
   capture:population.captureTargetPresent,rescue:population.rescueTargetPresent,
   valid,issues});
 }
}finally{activateSite(null);}
console.log(JSON.stringify({scope:'C7 offline seeded semantic parity',
 checked:rows.length,invalid:rows.filter(r=>!r.valid).length,rows},null,2));
if(rows.some(r=>!r.valid))process.exitCode=1;
