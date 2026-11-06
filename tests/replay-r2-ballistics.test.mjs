import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {summarizeCombatReview} from '../src/breach-combat-review.ts';

test('shots are captured between 20Hz world samples and persist after effect expiry',()=>{
  const session=newSession(0),recorder=new MissionRecorder();
  recorder.capture(session,true);
  session.seconds=1/60;
  session.shots.push({
    id:1,shooterId:'rook',targetId:null,side:'blue',
    start:{x:10,y:20},end:{x:40,y:25},age:0,
    hit:false,healthBefore:2,healthAfter:2,down:false,surface:'stone'
  });
  recorder.capture(session);
  recorder.capture(session);
  assert.equal(recorder.ballistics.shots.length,1);
  session.shots=[];
  session.seconds=.10;recorder.capture(session);
  assert.equal(recorder.ballistics.shots.length,1);
  assert.equal(recorder.ballistics.between(0,.1)[0].end.x,40);
  assert.equal(recorder.ballistics.between(.11,1).length,0);
  assert.equal(recorder.ballistics.between(0,1,'other').length,0);
  assert.equal(summarizeCombatReview(recorder.frames,recorder.events,
    recorder.ballistics.shots).observedProjectiles,1);
});
