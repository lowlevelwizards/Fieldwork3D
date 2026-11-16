import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTrainingSite} from '../src/training/training-site-builder.ts';
import {TRAINING_LAYOUTS,DEFAULT_TRAINING_CONFIG,normalizeTrainingConfig}
 from '../src/training/training-courses.ts';
import {TRIALS,trialConfig} from '../src/training/training-trials.ts';
import {planSiteLighting} from '../src/equipment-site-lighting.ts';
import {newSession} from '../src/breach-game.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
test('all killhouse configurations remain bounded and spawns are physically legal',()=>{
 for(const layout of TRAINING_LAYOUTS){
  const site=buildTrainingSite({...DEFAULT_TRAINING_CONFIG,layout});
  assert.ok(site.rooms.length<=8);
  assert.ok(site.doors.length<=12);
  assert.ok(site.cover.length<=10);
  const s=newSession(0,undefined,'full-view','small','hold',site);
  const world=sessionWorldGeometry(s);
  for(const point of site.spawn)assert.equal(world.passable(point,8),true,
   layout+' '+JSON.stringify(point));
 }
});
test('low-light scored training uses existing emergency/blackout fixture program',()=>{
 const config=normalizeTrainingConfig({...trialConfig('blackout'),
  activity:'trial',trial:'blackout'});
 const site=buildTrainingSite(config);
 assert.equal(site.trainingTrial?.id,'blackout');
 assert.equal(config.lighting,'blackout');
 const blackout=planSiteLighting(site,config.lighting);
 assert.equal(blackout.mode,'blackout');
 assert.ok(blackout.ambient<.1);
 assert.ok(blackout.fixtures.every(f=>f.power==='backup'));
 assert.equal(TRIALS.blackout.squadSize,2);
});
test('scored trial screen exposes scoring breakdown and failure override',async()=>{
 const {readFile}=await import('node:fs/promises');
 const file=await readFile(new URL('../src/ui/breach-training-screen.ts',import.meta.url),'utf8');
 assert.match(file,/SCORING/);
 assert.match(file,/SAFETY OR TIME FAILURE/);
});
