import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTrainingSite} from '../src/training/training-site-builder.ts';
import {DEFAULT_TRAINING_CONFIG} from '../src/training/training-courses.ts';
import {newSession} from '../src/breach-game.ts';
import {recordTrainingCoverStrike,trainingTargetProgress}
 from '../src/training/training-targets.ts';
test('only actual target strikes are retained once per target',()=>{
 const s=newSession(0,undefined,'full-view','small','hold',
  buildTrainingSite({...DEFAULT_TRAINING_CONFIG}));
 const piece=s.coverState.find(o=>o.fixture==='target-plate');
 assert.ok(piece?.id);
 assert.equal(recordTrainingCoverStrike(s,piece,'rook',1),true);
 assert.equal(recordTrainingCoverStrike(s,piece,'rook',2),false);
 assert.equal(trainingTargetProgress(s).hits,1);
 assert.equal(trainingTargetProgress(s).targets,4);
 assert.equal(Object.keys(s.trainingHits).length,1);
});
test('non-training, non-target and unknown shooter gain no credit',()=>{
 const s=newSession();
 const cover={id:'target-a',fixture:'target-plate',x:1,y:1,w:2,h:2};
 assert.equal(recordTrainingCoverStrike(s,cover,'rook',1),false);
 const t=newSession(0,undefined,'full-view','small','hold',
  buildTrainingSite({...DEFAULT_TRAINING_CONFIG}));
 assert.equal(recordTrainingCoverStrike(t,{...cover,fixture:'bench'},'rook',1),false);
 assert.equal(recordTrainingCoverStrike(t,cover,'unknown-shooter',1),false);
 assert.equal(trainingTargetProgress(t).hits,0);
});
