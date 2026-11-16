import test from 'node:test';
import assert from 'node:assert/strict';
import {TRIALS,trialConfig} from '../src/training/training-trials.ts';
import {normalizeTrainingConfig} from '../src/training/training-courses.ts';
import {buildTrainingSite} from '../src/training/training-site-builder.ts';
import {newSession} from '../src/breach-game.ts';
import {advanceTrainingTrial} from '../src/training/training-trial-controller.ts';
test('trial completion transitions only after all real targets are credited',()=>{
 const t=TRIALS.discrimination;
 const site=buildTrainingSite(normalizeTrainingConfig({
  ...trialConfig(t.id),activity:'trial',trial:t.id}));
 const s=newSession(0,undefined,'full-view','small','hold',site);
 s.phase='running';s.started=true;
 advanceTrainingTrial(s);assert.equal(s.phase,'running');
 for(const o of site.cover.filter(o=>o.fixture==='target-plate')){
  s.trainingHits[o.id]={targetId:o.id,shooterId:'rook',shotId:1,at:0,
   kind:'hostile'};
 }
 s.operators.find(o=>o.id==='rook').shots=site.cover.length;
 advanceTrainingTrial(s);
 assert.equal(s.phase,'won');
 assert.equal(s.mission,'done');
 const old=s.battleEvents.length;
 advanceTrainingTrial(s);assert.equal(s.battleEvents.length,old);
});
test('no-shoot target hit is an explicit failing course outcome',()=>{
 const t=TRIALS.discrimination;
 const site=buildTrainingSite(normalizeTrainingConfig({
  ...trialConfig(t.id),activity:'trial',trial:t.id}));
 const s=newSession(0,undefined,'full-view','small','hold',site);
 s.phase='running';s.started=true;
 const target=site.cover.find(o=>o.fixture==='target-no-shoot');
 s.trainingHits[target.id]={targetId:target.id,shooterId:'rook',
  shotId:1,at:.1,kind:'no-shoot'};
 advanceTrainingTrial(s);assert.equal(s.phase,'lost');
});
test('ordinary and free-practice sites never gain automatic trial outcome',()=>{
 const s=newSession();s.phase='running';advanceTrainingTrial(s);
 assert.equal(s.phase,'running');
});
