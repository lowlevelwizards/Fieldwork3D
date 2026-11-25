/** Separate the intentional new-site change from a change in simulation
 * on a previously generated site. Run against the actual PR base checkout. */
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {generateSite} from '../../src/breach-site.ts';
import {runStage1Scenario} from '../../tests/fixtures/breach-stage1-contract-runner.mjs';
import {newSession} from '../../src/breach-game.ts';
import {applyReplayFrame} from '../../src/breach-replay.ts';
import {captureMissionStart,siteForMissionRestart} from '../../src/breach-mission-restart.ts';
import {withTemporarySiteGeometry} from '../../src/breach-core.ts';
const base=resolve(process.env.V18_BASE_DIR??'v18-before');
const oldGenerate=(await import(pathToFileURL(resolve(base,'src/breach-site.ts')).href)).generateSite;
const oldRun=(await import(pathToFileURL(resolve(base,'tests/fixtures/breach-stage1-contract-runner.mjs')).href)).runStage1Scenario;
const options={seed:27,mission:'rescue',premise:'routine'};
const oldSite=oldGenerate(27,'small',undefined,options);
const newSite=generateSite(27,'small',undefined,options);
const args={mission:'rescue',intel:'floor-plan',enableCivilians:true,ticks:120,sampleEvery:20,record:true};
const oldResult=oldRun({...args,site:oldSite});
const preserved=runStage1Scenario({...args,site:oldSite});
const revised=runStage1Scenario({...args,site:newSite});
assert.equal(oldResult.fingerprint,'32b97cc3908c2c2655d5729996b6513d57efa339f1ed63b8b82aadf204592136');
assert.equal(preserved.fingerprint,oldResult.fingerprint,'saved site simulation changed');
assert.deepEqual(preserved.checkpoints,oldResult.checkpoints,'saved physical and actor snapshots changed');
assert.equal(revised.fingerprint,'4493f9bf02ba61ed927422ee60ef48dbf402eeda0b4aaa813e609246a59c1d88');
assert.notDeepEqual(newSite.cover,oldSite.cover,'new exterior generation must actually change');
assert.equal(revised.fingerprint,runStage1Scenario({...args,site:newSite,record:false}).fingerprint);
for(const [site,result] of [[oldSite,preserved],[newSite,revised]]){
 assert.equal(result.recorder.completeness.complete,true);
 const target=result.first.civilians.find(c=>c.rescueTarget);
 assert.ok(target&&result.last.civilians.some(c=>c.id===target.id));
 withTemporarySiteGeometry(null,()=>{
  const session=newSession(0,undefined,'floor-plan','small','rescue',structuredClone(site),{enableCivilians:true});
  const start=captureMissionStart(session,'small');
  for(const frame of [result.recorder.frames.at(-1),result.recorder.frames[0],result.recorder.frames.at(-1)]){
   applyReplayFrame(session,frame);
   assert.equal(session.seconds,frame.t);
   assert.deepEqual(session.coverState.map(c=>[c.x,c.y,c.w,c.h]),frame.coverState.map(c=>[c.x,c.y,c.w,c.h]));
   assert.ok(session.civilians.some(c=>c.id===target.id));
  }
  assert.deepEqual(siteForMissionRestart(start),site);
 });
}
console.log('V18_REPLAY_COMPAT '+JSON.stringify({old:oldResult.fingerprint,preserved:preserved.fingerprint,new:revised.fingerprint,oldCover:oldSite.cover.length,newCover:newSite.cover.length,oldFamily:oldSite.planFamily,newFamily:newSite.planFamily}));
