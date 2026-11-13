/** A3.0 baseline: deterministic scenario identities + separate measured
 * CPU costs. Not a CI performance-threshold gate or gameplay scheduler. */
import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';
import {A3_SCENES,DEFAULT_A3_CONFIG,createA3Session}
 from '../src/a3-physicality-scenarios.ts';
import {probeA3} from '../src/a3-physicality-probe.ts';
import {stepSession,team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
const results=[];
for(const scene of A3_SCENES){
 const cfg={...DEFAULT_A3_CONFIG,scenario:scene.id};
 const s=createA3Session(cfg),costs={stepMs:0,probeMs:0,probeChecks:0};
 let snapshot=probeA3(s,cfg);
 for(let i=0;i<60;i++){
  let start=performance.now();stepSession(s,1/60);
  costs.stepMs+=performance.now()-start;
  start=performance.now();snapshot=probeA3(s,cfg);
  costs.probeMs+=performance.now()-start;
  costs.probeChecks+=snapshot.legacyRecovery.checks;
 }
 results.push({
  scenario:scene.id,ticks:60,seed:cfg.seed,
  final:{time:snapshot.seconds,lane:snapshot.shot.lane,
   weaponBlocked:snapshot.shot.hardBlocked,
   carry:snapshot.carry.handling,actors:team(s).filter(x=>x.health>0)
    .map(x=>({id:x.id,p:{...x.p},posture:x.posture}))},
  wallTime:{totalStepMs:costs.stepMs,totalProbeMs:costs.probeMs,
   meanStepMs:costs.stepMs/60,meanProbeMs:costs.probeMs/60,
   candidateChecks:costs.probeChecks}
 });
 activateSite(null);
}
const report={kind:'fieldwork-a3-0-cpu-baseline',
 note:'Measurements vary by runner; never use timestamps as deterministic state.',
 results};
const dest=process.argv.includes('--out')?
 process.argv[process.argv.indexOf('--out')+1]:'artifacts/animation-a3-0/baseline.json';
await mkdir(dest.slice(0,dest.lastIndexOf('/'))||'.',{recursive:true});
await writeFile(dest,JSON.stringify(report,null,2)+'\n');
console.log('A3.0 real session baseline',JSON.stringify(results.map(x=>({
 scene:x.scenario,lane:x.final.lane,meanStepMs:x.wallTime.meanStepMs,
 meanProbeMs:x.wallTime.meanProbeMs
}))));
