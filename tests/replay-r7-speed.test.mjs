import test from 'node:test';
import assert from 'node:assert/strict';
import {REPLAY_SPEED_STOPS,REPLAY_SPEED_MAJOR,
 speedIndex,speedFromIndex,smoothReplaySpeed}
 from '../src/breach-replay-speed.ts';
test('detents include main and intermediate speeds in monotonic order',()=>{
 assert.deepEqual([...REPLAY_SPEED_MAJOR],[1,1.5,2,4]);
 assert.equal(REPLAY_SPEED_STOPS.length,12);
 assert.deepEqual([...REPLAY_SPEED_STOPS].sort((a,b)=>a-b),
   [...REPLAY_SPEED_STOPS]);
 for(const rate of REPLAY_SPEED_STOPS)
   assert.equal(speedFromIndex(speedIndex(rate)),rate);
 assert.equal(speedFromIndex(-10),.25);
 assert.equal(speedFromIndex(500),4);
});
test('rate change smoothly converges and never reverses playback',()=>{
 let rate=1;
 for(let i=0;i<30;i++){
   const next=smoothReplaySpeed(rate,4,1/60);
   assert.ok(next>=rate&&next<=4);
   rate=next;
 }
 assert.ok(rate>3.5&&rate<4.001);
 for(let i=0;i<30;i++){
   const next=smoothReplaySpeed(rate,.5,1/60);
   assert.ok(next<=rate&&next>=.5);
   rate=next;
 }
 assert.ok(rate<1);
 assert.equal(smoothReplaySpeed(NaN,1,1/60),1);
 assert.ok(smoothReplaySpeed(2,4,0)===2);
});
