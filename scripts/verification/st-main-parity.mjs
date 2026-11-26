/** Exact base/current-head comparison, separate from the historical V18
 * and C11 fixtures. Existing saved maps are run in both actual engines;
 * fresh ST maps may change frontage but never architecture/encounters. */
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {generateSite} from '../../src/breach-site.ts';
import {runStage1Scenario} from '../../tests/fixtures/breach-stage1-contract-runner.mjs';
import {newSession} from '../../src/breach-game.ts';
import {withTemporarySiteGeometry} from '../../src/breach-core.ts';
import {captureMissionStart,siteForMissionRestart} from '../../src/breach-mission-restart.ts';
import {applyReplayFrame} from '../../src/breach-replay.ts';
import {streetConflicts} from '../../src/worldgen/street-infrastructure.ts';
const base=resolve(process.env.ST_BASE_DIR??'st-before');
const oldGenerate=(await import(pathToFileURL(resolve(base,'src/breach-site.ts')).href)).generateSite;
const oldRun=(await import(pathToFileURL(resolve(base,'tests/fixtures/breach-stage1-contract-runner.mjs')).href)).runStage1Scenario;
const cases=[...['clear','hold','intel','rescue','capture'].flatMap(mission=>[16,21,38].map(seed=>({seed,mission,scale:'small'}))),
 {seed:4,mission:'rescue',scale:'large'},{seed:7,mission:'intel',scale:'standard'},{seed:27,mission:'rescue',scale:'small'}];
const rows=[];let modernWitness;
const structuralWindows=windows=>windows?.map(({covering,...w})=>({...w,treatment:w.treatment==='open-curtains'?'none':w.treatment}));
const structuralSite=site=>({...site,windows:structuralWindows(site.windows)});
for(const {seed,mission,scale} of cases){
 const context={mission,premise:'routine'};
 const old=oldGenerate(seed,scale,undefined,context);
 const oldLegacy=oldGenerate(seed,scale,undefined,context,{streetInfrastructure:false});
 const legacy=generateSite(seed,scale,undefined,context,{streetInfrastructure:false});
 const historicalStreet=generateSite(seed,scale,undefined,context);
 const next=generateSite(seed,scale,undefined,context);
 const sameArchitecture=generateSite(seed,scale,undefined,context,{streetInfrastructure:false});
 assert.deepEqual(structuralSite(legacy),structuralSite(oldLegacy),'exact base legacy layout '+seed+':'+mission+':'+scale);
 for(const key of ['rooms','walls','doors','windows','spawn','enemies','objective','extract','encounter','identity','planFamily']){
  assert.deepEqual(key==='windows'?structuralWindows(historicalStreet[key]):historicalStreet[key],key==='windows'?structuralWindows(old[key]):old[key],'historical new-site mission contract '+seed+':'+mission+':'+key);
  assert.deepEqual(next[key],sameArchitecture[key],'street cannot alter selected architecture '+seed+':'+mission+':'+key);
 }
 if(next.streetInfrastructure){
  assert.deepEqual(streetConflicts(next,next.streetInfrastructure),[]);
  modernWitness??={site:next,mission,scale};
 }
 const row={seed,mission,scale,modern:!!next.streetInfrastructure};
 if(seed===27||scale==='large'){
  const args={site:old,mission,intel:'floor-plan',enableCivilians:true,ticks:120,sampleEvery:20,record:true};
  const before=oldRun(args),after=runStage1Scenario(args);
  assert.deepEqual(after.checkpoints,before.checkpoints,'saved site physics changed');
  assert.equal(after.fingerprint,before.fingerprint);
  row.historicalFingerprint=after.fingerprint;
 }
 rows.push(row);
}
assert.ok(modernWitness,'default must actually generate a modern site');
const {site,mission,scale}=modernWitness;
const result=runStage1Scenario({site,mission,intel:'floor-plan',enableCivilians:true,ticks:120,sampleEvery:20,record:true});
assert.equal(result.recorder.completeness.complete,true);
withTemporarySiteGeometry(null,()=>{
 const session=newSession(0,undefined,'floor-plan',scale,mission,structuredClone(site),{enableCivilians:true});
 const start=captureMissionStart(session,scale);
 assert.deepEqual(siteForMissionRestart(start),site,'restart loses street snapshot');
 for(const frame of [result.recorder.frames.at(-1),result.recorder.frames[0]]){
  applyReplayFrame(session,frame);
  assert.equal(session.seconds,frame.t);
  assert.deepEqual(session.coverState.map(c=>[c.x,c.y,c.w,c.h]),frame.coverState.map(c=>[c.x,c.y,c.w,c.h]));
 }
});
const evidence={rows,modernWitness:{seed:site.seed,mission,scale,fingerprint:result.fingerprint}};
writeFileSync('st-main-parity.json',JSON.stringify(evidence,null,2)+'\n');
console.log('ST exact main parity',JSON.stringify(evidence));
