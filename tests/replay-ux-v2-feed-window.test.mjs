import assert from 'node:assert/strict';
import test from 'node:test';
import {replayFeedPosition} from '../src/breach-replay-feed-window.ts';
test('event feed is bounded and tracks seek positions without re-sorting',()=>{
  const events=Array.from({length:300},(_,i)=>({t:i*0.2}));
  assert.deepEqual(replayFeedPosition([],0),{start:0,end:0,focusIndex:-1});
  const middle=replayFeedPosition(events,30);
  assert.equal(middle.focusIndex,150);
  assert.equal(middle.end-middle.start,80);
  const end=replayFeedPosition(events,100);
  assert.equal(end.end,300);
  assert.equal(end.focusIndex,299);
});
test('duplicate-timestamp events use most recent eligible event',()=>{
  assert.equal(replayFeedPosition([{t:1},{t:2},{t:2},{t:3}],2).focusIndex,2);
});
