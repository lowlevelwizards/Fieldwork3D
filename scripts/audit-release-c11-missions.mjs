/** C11 exact generated mission population/state corpus.
 * Built from real authority, not anticipated spawn positions or mock props.
 * CI-host generation timings are not gameplay FPS.
 */
import {writeFileSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {auditMissionScenario} from '../src/breach-mission-semantics.ts';
import {auditSite} from '../src/breach-site-audit.ts';
import {activateSite} from '../src/breach-core.ts';
const seedList=[16,21,38],missions=['clear','hold','intel','rescue','capture'];
const rows=[];
try{
 for(const mission of missions)for(const seed of seedList){
  const site=generateSite(seed,'small',undefined,{mission});
  const audits=auditMissionScenario(site,{mission});
  const observed=auditSite(site);
  const plan=site.encounter;
  rows.push({seed,mission,archetype:site.archetype,quality:observed.compositeQuality.score,
   blockedRoutes:observed.mobilityQuality.blockedApproaches+
     observed.mobilityQuality.blockedFlow,
   errors:observed.errors,
   objective:site.objective,extract:site.extract,
   targetCount:plan?.actors.filter(a=>a.role==='target').length??0,
   hostiles:plan?.actors.map(a=>({id:a.id,role:a.role,groupId:a.groupId,
     position:a.position,heading:a.heading,roomId:a.roomId,zoneId:a.zoneId,
     activity:a.activity,readiness:a.readiness,weaponProfile:a.weaponProfile}))??[],
   civilians:plan?.neutrals?.map(c=>({id:c.id,position:c.position,
     roomId:c.roomId,role:c.role,activity:c.activity,
     isRescueTarget:c.isRescueTarget}))??[],
   groups:plan?.groups,
   semanticErrors:audits.filter(a=>a.severity==='error').map(a=>a.code)
  });
 }
}finally{activateSite(null);}
const summary={sampled:rows.length,operations:missions,invalid:rows.filter(r=>r.errors.length).length,
 semanticInvalid:rows.filter(r=>r.semanticErrors.length).length};
console.log('C11 mission world corpus',JSON.stringify(summary));
if(process.argv[2])writeFileSync(process.argv[2],
 JSON.stringify({summary,rows},null,2)+'\n');
if(summary.invalid||summary.semanticInvalid||rows.length!==15)process.exitCode=1;
