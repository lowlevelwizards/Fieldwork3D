import test from 'node:test';
import assert from 'node:assert/strict';
import {TRIALS,trialConfig} from '../src/training/training-trials.ts';
import {normalizeTrainingConfig} from '../src/training/training-courses.ts';
import {buildTrainingSite} from '../src/training/training-site-builder.ts';
test('single-room trial targets and objective are within one physical room',()=>{
 const id='room',site=buildTrainingSite(normalizeTrainingConfig({
  ...trialConfig(id),activity:'trial',trial:id}));
 const room=site.rooms.find(x=>x.id==='L1');
 assert.ok(room);
 const targets=site.cover.filter(o=>o.fixture==='target-plate');
 assert.equal(targets.length,3);
 for(const target of targets){
  assert.ok(target.x>room.x&&target.x<room.x+room.w);
  assert.ok(target.y>room.y&&target.y<room.y+room.h);
 }
 assert.ok(site.objective.x>room.x&&site.objective.y>room.y);
 assert.equal(TRIALS[id].goal,'room');
});
