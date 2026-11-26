import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {vehicleFamily} from '../src/worldgen/vehicle-catalog.ts';
import {runStage1Scenario} from './fixtures/breach-stage1-contract-runner.mjs';
import {newSession} from '../src/breach-game.ts';
import {withTemporarySiteGeometry} from '../src/breach-core.ts';
import {applyReplayFrame} from '../src/breach-replay.ts';
import {captureMissionStart,siteForMissionRestart} from '../src/breach-mission-restart.ts';
test('default occupied site has deterministic live, recording and restarted vehicle state',()=>{
 const site=generateSite(4,'large');
 const cars=site.cover.filter(c=>vehicleFamily(c.fixture??''));
 assert.ok(cars.length>=2,'known office parking witness must actually contain vehicles');
 assert.ok(cars.every(c=>c.id&&c.vehicleProfile?.version===3));
 const authored=JSON.stringify(site);
 const args={site,mission:'hold',intel:'exterior-known',ticks:120,sampleEvery:20,record:true};
 const first=runStage1Scenario(args),again=runStage1Scenario({...args,site:structuredClone(site),record:false});
 assert.equal(first.fingerprint,again.fingerprint);
 assert.deepEqual(first.checkpoints,again.checkpoints);
 assert.equal(first.recorder.completeness.complete,true);
 withTemporarySiteGeometry(null,()=>{
  const playback=newSession(0,undefined,'exterior-known','large','hold',structuredClone(site));
  const start=captureMissionStart(playback,'large');
  for(const frame of [first.recorder.frames.at(-1),first.recorder.frames[0],first.recorder.frames.at(-1)]){
   applyReplayFrame(playback,frame);
   assert.equal(playback.seconds,frame.t);
   assert.deepEqual(playback.coverState.map(c=>[c.x,c.y,c.w,c.h]),frame.coverState.map(c=>[c.x,c.y,c.w,c.h]));
   for(const car of cars){
    const live=playback.coverState.find(c=>c.id===car.id);
    assert.ok(live);assert.deepEqual(live.vehicleProfile,car.vehicleProfile);
   }
  }
  assert.deepEqual(siteForMissionRestart(start),site);
 });
 assert.equal(JSON.stringify(site),authored);
});
