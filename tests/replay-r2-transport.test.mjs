import test from 'node:test';
import assert from 'node:assert/strict';
import {stepReplaySample,stepReplayPresentation,formatReplayTime}
  from '../src/breach-replay-transport.ts';

test('recorded sample stepping skips exact timestamp and clamps at bounds',()=>{
  const frames=[0,.05,.10,.15].map(t=>({t}));
  assert.equal(stepReplaySample(frames,0,1),.05);
  assert.equal(stepReplaySample(frames,.051,1),.10);
  assert.equal(stepReplaySample(frames,.10,-1),.05);
  assert.equal(stepReplaySample(frames,.099,-1),.05);
  assert.equal(stepReplaySample(frames,0,-1),0);
  assert.equal(stepReplaySample(frames,.15,1),.15);
});
test('visual frame stepping follows 60 fps while retaining 20Hz outcomes',()=>{
  assert.ok(Math.abs(stepReplayPresentation(0,.3,1,60)-1/60)<1e-8);
  assert.ok(Math.abs(stepReplayPresentation(.05,.3,1,60)-4/60)<1e-8);
  assert.ok(Math.abs(stepReplayPresentation(.05,.3,-1,60)-2/60)<1e-8);
  assert.equal(stepReplayPresentation(0,.3,-1),0);
  assert.equal(stepReplayPresentation(.3,.3,1),.3);
  assert.equal(formatReplayTime(84.65),'01:24.650');
});
