import test from 'node:test';
import assert from 'node:assert/strict';
import {TRIAL_IDS,TRIALS,trialConfig} from '../src/training/training-trials.ts';
import {normalizeTrainingConfig} from '../src/training/training-courses.ts';
import {buildTrainingSite} from '../src/training/training-site-builder.ts';
import {recordTrainingCoverStrike,trainingTargetProgress}
 from '../src/training/training-targets.ts';
import {assessTrainingTrial} from '../src/training/training-scoring.ts';
import {newSession} from '../src/breach-game.ts';
test('versioned trials build reproducible physical targets and no-shoot plates',()=>{
 for(const id of TRIAL_IDS){
  const cfg=normalizeTrainingConfig({...trialConfig(id),activity:'trial',trial:id});
  const site=buildTrainingSite(cfg);
  assert.equal(site.trainingTrial?.id,id);
  assert.equal(site.trainingTrial?.version,1);
  assert.equal(site.cover.filter(o=>o.fixture==='target-no-shoot').length,
   TRIALS[id].noShootSlots.length);
  assert.deepEqual(site,buildTrainingSite(cfg));
 }
});
test('no-shoot strike penalizes outcome without awarding a hostile hit',()=>{
 const id='discrimination',cfg=normalizeTrainingConfig({
  ...trialConfig(id),activity:'trial',trial:id});
 const s=newSession(0,undefined,'full-view','small','hold',buildTrainingSite(cfg));
 const item=s.coverState.find(o=>o.fixture==='target-no-shoot');
 assert.ok(item?.id);
 assert.equal(recordTrainingCoverStrike(s,item,'rook',1),true);
 assert.equal(recordTrainingCoverStrike(s,item,'rook',2),false);
 assert.equal(trainingTargetProgress(s).noShootHits,1);
 assert.equal(trainingTargetProgress(s).hits,0);
 assert.equal(assessTrainingTrial(s,TRIALS[id]).outcome,'failed');
});
