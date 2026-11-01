import test from 'node:test';import assert from 'node:assert/strict';
import {FrameMeter} from '../src/breach-perf.ts';
test('rolling frame meter reports p95 and frame slices without negatives',()=>{
  const meter=new FrameMeter();
  for(let i=0;i<130;i++)meter.add({frame:i===129?80:16,cadence:i===129?180:17,
    sim:4,scene:8,overlay:1,steps:1,draws:100,triangles:7000});
  const r=meter.summary();
  assert.equal(r.worst,80);
  assert.ok(r.rafP95>=17);
  assert.ok(r.rafP50>=17);
  assert.ok(r.p95>=16&&r.p50===16);
  assert.equal(r.steps,1);assert.equal(r.draws,100);
});