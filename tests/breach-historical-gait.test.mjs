import test from 'node:test';import assert from 'node:assert/strict';
import {LabHistoricalMotionCache,LabMotionCache}
  from '../src/breach-lab-tracks.ts';
test('historical and current gait reproduce the same authored root track',()=>{
 const old=new LabHistoricalMotionCache('walk'),now=new LabMotionCache('walk');
 for(const t of [0,.4,1,2,3.25,3.9]){
  const a=old.sample(t),b=now.sample(t);
  assert.deepEqual(a.motion,b.motion);
  for(const foot of [...a.feet,...b.feet]){
    assert.ok(Number.isFinite(foot.position.x));
    assert.ok(Number.isFinite(foot.position.y));
  }
 }
});