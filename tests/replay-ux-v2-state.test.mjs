import assert from 'node:assert/strict';
import test from 'node:test';
import {toggleReplaySurface,replayCameraAvailable,resolvedReplayCamera,
  isReplaySpeed,clampReplayTime} from '../src/breach-replay-ui-state.ts';

test('replay surfaces toggle without disturbing transport',()=>{
  assert.equal(toggleReplaySurface('none','moments'),'moments');
  assert.equal(toggleReplaySurface('moments','moments'),'none');
  assert.equal(toggleReplaySurface('moments','analyze'),'analyze');
});
test('camera capability is explicit and preserves the independent perspective',()=>{
  assert.equal(replayCameraAvailable('director','plan2d',true,false),false);
  assert.equal(resolvedReplayCamera('director','plan2d',true,false),'free');
  assert.equal(resolvedReplayCamera('operator','iso',true,false),'operator');
  assert.equal(resolvedReplayCamera('squad','iso',true,true),'free');
});
test('speed choices and seek bounds reject invalid values',()=>{
  assert.equal(isReplaySpeed(.75),true);
  assert.equal(isReplaySpeed(8),false);
  assert.equal(clampReplayTime(-20,180),0);
  assert.equal(clampReplayTime(200,180),180);
  assert.equal(clampReplayTime(Number.NaN,180),0);
});
