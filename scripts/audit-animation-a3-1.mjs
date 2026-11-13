/** A3.1 diagnostic comparison of CURRENT live posture-aware physics against
 * the A3.0 legacy flat guard for exactly the same actor/muzzle/target state.
 * Real-time CPU costs remain separate from deterministic state snapshots.
 */
import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';
import {DEFAULT_A3_CONFIG,A3_SCENES,createA3Session}
 from '../src/a3-physicality-scenarios.ts';
import {probeA3} from '../src/a3-physicality-probe.ts';
import {stepSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
const results=[];
for(const scene of A3_SCENES){
 for(const posture of ['stand','crouch']){
  const config={...DEFAULT_A3_CONFIG,scenario:scene.id,posture};
  const s=createA3Session(config);
  let checks=0,totalMs=0,sample=null;
  for(let tick=0;tick<60;tick++){
   stepSession(s,1/60);
   const start=performance.now();
   sample=probeA3(s,config);
   totalMs+=performance.now()-start;checks+=sample.legacyRecovery.checks;
  }
  results.push({scenario:scene.id,posture,seed:config.seed,
   ticks:60,final:{
    currentLane:sample.shot.lane,
    legacyPlanarLane:sample.shot.legacyPlanarLane,
    currentWeaponBlocked:sample.shot.hardBlocked,
    currentPresentationBlocked:sample.presentation.blocked,
    currentMuzzle:sample.shot.muzzle,
    changedByHeight:sample.shot.changedByHeight
   },measurements:{meanProbeMs:totalMs/60,candidateChecks:checks}});
  activateSite(null);
 }
}
const artifact={kind:'fieldwork-a3-1-friendly-volume-audit',
 note:'CPU times are hardware dependent; no timing data drives fixed simulation state.',
 results};
const output=process.argv.includes('--out')?
 process.argv[process.argv.indexOf('--out')+1]:
 'artifacts/animation-a3-1/height-aware-baseline.json';
await mkdir(output.slice(0,output.lastIndexOf('/'))||'.',{recursive:true});
await writeFile(output,JSON.stringify(artifact,null,2)+'\n');
console.log('A3.1 current vs legacy',JSON.stringify(results.map(x=>({
 scene:x.scenario,posture:x.posture,current:x.final.currentLane,
 old:x.final.legacyPlanarLane,ms:x.measurements.meanProbeMs
}))));
