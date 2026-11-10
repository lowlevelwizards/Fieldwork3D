import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayPlaybackController}
 from '../src/breach-replay-playback-controller.ts';
import {makeAfterActionLaunchRequest}
 from '../src/breach-after-action-replay-navigation.ts';
test('scoped bodycam clip scrubs inside boundary and survives unclip/reclip',()=>{
 const p=new ReplayPlaybackController();
 assert.equal(p.startIncident({start:10,end:11},50,true),true);
 assert.deepEqual(p.incident.range,{start:7,end:16});
 p.seek(13,50);assert.equal(p.time,13);
 assert.ok(p.incident,'scrub inside clip retains looping');
 p.seek(30,50);assert.equal(p.time,16);
 assert.ok(p.incident,'out of range drag never silently unclipped');
 assert.equal(p.unclipIncident(),true);
 p.seek(30,50);assert.equal(p.time,30);
 assert.equal(p.reclipIncident(),true);
 assert.equal(p.time,16);
 assert.equal(p.incident.loop,true);
});
test('contact clip uses recorded first and last shot, no fabricated timestamps',()=>{
 const rec={duration:40,ballistics:{shots:[
  {id:1,targetId:'guard',recordedAt:9},
  {id:2,targetId:'guard',recordedAt:12}
 ]}};
 assert.deepEqual(makeAfterActionLaunchRequest(rec,{
  surface:'combat',contactId:'guard',time:13}).range,{start:9,end:12});
 assert.deepEqual(makeAfterActionLaunchRequest(rec,{
  surface:'combat',contactId:'guard',shotId:2,time:12}).range,
  {start:12,end:12});
});
