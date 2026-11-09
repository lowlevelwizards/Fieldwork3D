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
  assert.equal(r.recording,0,'older callers report zero recording overhead');
});
test('diagnostics separately report recorder overhead without double counting the frame',()=>{
  const meter=new FrameMeter();
  meter.add({frame:20,cadence:21,sim:8,recording:3,
    scene:9,overlay:2,steps:2,draws:140,triangles:3000});
  meter.add({frame:30,cadence:32,sim:12,recording:5,
    scene:12,overlay:3,steps:2,draws:150,triangles:3200});
  const result=meter.summary();
  assert.equal(result.recording,4);
  assert.equal(result.simulation,10,'sim includes recorder and other fixed-step work');
  assert.equal(result.scene,10.5);
  assert.equal(result.steps,2);
});
