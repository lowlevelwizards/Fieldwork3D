import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {buildTrainingSite} from '../src/training/training-site-builder.ts';
import {DEFAULT_TRAINING_CONFIG,normalizeTrainingConfig}
 from '../src/training/training-courses.ts';
import {resetPracticeTargets,recordTrainingCoverStrike,trainingTargetProgress}
 from '../src/training/training-targets.ts';
test('free-practice reset restores only physical targets and hit marks',()=>{
 const s=newSession(0,undefined,'full-view','small','hold',
  buildTrainingSite({...DEFAULT_TRAINING_CONFIG}));
 const target=s.coverState.find(o=>o.fixture==='target-plate');
 assert.ok(target);
 const original={w:target.w,h:target.h};
 recordTrainingCoverStrike(s,target,'rook',1);
 target.w=11;target.h=9;target.integrity=0;target.destroyed=true;
 const beforeShots=s.operators.find(o=>o.id==='rook').shots;
 assert.equal(resetPracticeTargets(s),true);
 assert.equal(target.w,original.w);
 assert.equal(target.h,original.h);
 assert.equal(target.destroyed,false);
 assert.equal(trainingTargetProgress(s).hits,0);
 assert.equal(s.operators.find(o=>o.id==='rook').shots,beforeShots);
});
test('reset cannot bypass a scored trial or restore cover on top of squad',()=>{
 const trial=newSession(0,undefined,'full-view','small','hold',
  buildTrainingSite(normalizeTrainingConfig({
   activity:'trial',trial:'discrimination'})));
 assert.equal(resetPracticeTargets(trial),false);
 const s=newSession(0,undefined,'full-view','small','hold',
  buildTrainingSite({...DEFAULT_TRAINING_CONFIG}));
 const target=s.coverState.find(o=>o.fixture==='target-plate');
 const a=s.operators.find(o=>o.id==='rook');a.p={x:target.x,y:target.y};
 recordTrainingCoverStrike(s,target,'rook',1);
 assert.equal(resetPracticeTargets(s),false);
 assert.equal(trainingTargetProgress(s).hits,1);
});
