import test from 'node:test';
import assert from 'node:assert/strict';
import {makeReplayLoop,advanceReplayLoop} from '../src/breach-replay-loop.ts';
test('loop ranges require a real interval and stay inside recording',()=>{
 assert.deepEqual(makeReplayLoop(1,3,9),{start:1,end:3});
 assert.equal(makeReplayLoop(3,1,9),null);
 assert.equal(makeReplayLoop(1,1.2,9),null);
 assert.deepEqual(makeReplayLoop(-1,12,9),{start:0,end:9});
 assert.equal(makeReplayLoop(null,3,9),null);
});
test('loop advances and wraps deterministically instead of accumulating time',()=>{
 const range={start:2,end:4};
 assert.deepEqual(advanceReplayLoop(2,.1,range,8),{time:2.1,wrapped:false});
 assert.deepEqual(advanceReplayLoop(3.9,.2,range,8),
  {time:2.0999999999999996,wrapped:true});
 assert.deepEqual(advanceReplayLoop(6,.2,range,8),{time:2,wrapped:true});
 assert.deepEqual(advanceReplayLoop(7,4,null,8),{time:8,wrapped:false});
});
