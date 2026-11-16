import test from 'node:test';
import assert from 'node:assert/strict';
import {TRIALS,trialConfig} from '../src/training/training-trials.ts';
import {buildTrainingSite} from '../src/training/training-site-builder.ts';
import {normalizeTrainingConfig} from '../src/training/training-courses.ts';
import {newSession} from '../src/breach-game.ts';
import {assessTrainingTrial} from '../src/training/training-scoring.ts';
test('four-person coordination trial finishes at the FAR end of the killhouse',()=>{
 const id='squad';
 const site=buildTrainingSite(normalizeTrainingConfig({
  ...trialConfig(id),activity:'trial',trial:id
 }));
 assert.ok(site.spawn.every(p=>Math.hypot(p.x-site.extract.x,p.y-site.extract.y)>300));
 const s=newSession(0,undefined,'full-view','small','hold',site);
 for(const o of site.cover.filter(o=>o.fixture==='target-plate')){
  s.trainingHits[o.id]={targetId:o.id,shooterId:'rook',shotId:1,at:1,kind:'hostile'};
 }
 assert.equal(assessTrainingTrial(s,TRIALS.squad).outcome,'incomplete');
 const squad=s.operators.filter(o=>o.side==='blue');
 assert.equal(squad.length,4);
 squad.forEach(a=>a.p={...site.extract});
 assert.equal(assessTrainingTrial(s,TRIALS.squad).outcome,'passed');
});
