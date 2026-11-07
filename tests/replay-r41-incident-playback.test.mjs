import test from 'node:test';
import assert from 'node:assert/strict';
import {incidentPlaybackWindow,advanceIncidentPlayback}
  from '../src/breach-replay-incident-playback.ts';
test('clamps incident review to film boundaries, no fictional time',()=>{
  assert.deepEqual(incidentPlaybackWindow({start:1,end:2},9),
    {start:0,end:7});
  assert.deepEqual(incidentPlaybackWindow({start:18,end:20},20),
    {start:15,end:20});
  assert.equal(incidentPlaybackWindow({start:19,end:21},20),null);
  assert.equal(incidentPlaybackWindow({start:2,end:1},20),null);
  assert.equal(incidentPlaybackWindow({start:0,end:.05},.1),null);
});
test('Watch pauses exactly at incident end, never overshoots',()=>{
  const window={start:4,end:10};
  assert.deepEqual(advanceIncidentPlayback(9.9,3,window,false),{
    time:10,wrapped:false,finished:true
  });
  assert.deepEqual(advanceIncidentPlayback(6,1,window,false),{
    time:7,wrapped:false,finished:false
  });
});
test('Loop wraps within incident window and signals audio reset',()=>{
  const window={start:4,end:10};
  assert.deepEqual(advanceIncidentPlayback(9,2,window,true),{
    time:5,wrapped:true,finished:false
  });
  assert.deepEqual(advanceIncidentPlayback(8,14,window,true),{
    time:4,wrapped:true,finished:false
  });
});
test('seek outside interval does not extrapolate',()=>{
  const window={start:4,end:10};
  assert.deepEqual(advanceIncidentPlayback(1,.5,window,false),{
    time:4,wrapped:true,finished:false
  });
  assert.equal(advanceIncidentPlayback(NaN,.1,window,false).finished,true);
});
