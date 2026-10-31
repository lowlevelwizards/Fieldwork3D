import test from 'node:test';
import assert from 'node:assert/strict';
import {LabMotionCache,LabHistoricalMotionCache,LabDistanceMotionCache}
 from '../src/breach-lab-tracks.ts';
test('lab gait sampling never advances or rewrites cached foot contacts',()=>{
 for(const C of [LabMotionCache,LabHistoricalMotionCache,LabDistanceMotionCache]){
  const c=new C('walk');
  const before=JSON.stringify(c.targets);
  const first=c.sample(1.238);
  c.sample(3.5);c.sample(.2);
  assert.deepEqual(c.sample(1.238),first);
  assert.equal(JSON.stringify(c.targets),before);
  assert.equal(c.targets.length,241);
 }
});
test('a sampled contact transition never invents an intermediate touchdown',()=>{
 const c=new LabHistoricalMotionCache('run');
 for(let i=0;i<240;i++){
  const midpoint=c.sample((i+.5)/60).feet;
  const boundary=c.targets[i];
  for(let j=0;j<2;j++)
   if(boundary[j].phase!==c.targets[i+1][j].phase)
    assert.equal(midpoint[j].phase,boundary[j].phase);
 }
});