import test from 'node:test';
import assert from 'node:assert/strict';
import {DoorRangeMobileProfile,DOOR_RANGE_PROFILE_BUCKET_COUNT}
 from '../src/door-range-mobile-profile.ts';

test('D6 opt-in mobile timeline bins all RAF intervals without GPU attribution',()=>{
 const p=new DoorRangeMobileProfile();
 assert.equal(p.add({at:100,raf:16,sim:2,paint:1,steps:1}),true);
 assert.equal(p.add({at:180,raf:38,sim:4,paint:3,steps:2}),false);
 assert.equal(p.add({at:280,raf:95,sim:12,paint:8,steps:8}),true);
 const s=p.snapshot(300);
 assert.equal(s.frames,3);
 assert.equal(s.ticks,11);
 assert.equal(s.slow,2);
 assert.equal(s.severe,1);
 assert.equal(s.worstRaf,95);
 assert.equal(s.worstSim,12);
 assert.equal(s.meanPaint,4);
 assert.deepEqual(s.buckets.map(b=>[b.index,b.frames,b.worstRaf]),
  [[0,2,38],[1,1,95]]);
});
test('D6 60-second fixed ring expires historical spikes and never grows',()=>{
 const p=new DoorRangeMobileProfile();
 p.add({at:0,raf:12000,sim:1,paint:1,steps:0});
 for(let i=1;i<=300;i++)p.add({
  at:i*250,raf:16,sim:2,paint:2,steps:1
 });
 const s=p.snapshot(75000);
 assert.ok(s.buckets.length<=DOOR_RANGE_PROFILE_BUCKET_COUNT);
 assert.equal(s.worstRaf,16);
 assert.equal(s.suspensions,0);
 assert.equal(s.buckets[0].at>=15000,true);
 p.reset();
 assert.equal(p.snapshot(75000).frames,0);
});
test('D6 background suspensions are explicit, invalid samples stay bounded',()=>{
 const p=new DoorRangeMobileProfile();
 assert.equal(p.add({at:NaN,raf:1,sim:1,paint:1,steps:1}),false);
 p.add({at:1000,raf:2000,sim:NaN,paint:-3,steps:-1});
 const s=p.snapshot(1000);
 assert.equal(s.suspensions,1);
 assert.equal(s.slow,1);
 assert.equal(s.severe,1);
 assert.equal(s.meanSim,0);
 assert.equal(s.meanPaint,0);
 assert.equal(s.ticks,0);
});
