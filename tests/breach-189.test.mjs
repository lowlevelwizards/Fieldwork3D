import test from 'node:test';
import assert from 'node:assert/strict';
import {squeezeFacing,profileSamples} from '../src/breach-navigation.ts';
import {gaitBounds} from '../src/breach-footsteps.ts';
test('189: narrow torso capsule aligns shoulders along direction of travel',()=>{
  const samples=profileSamples({x:0,y:0},squeezeFacing(0),'squeeze');
  assert.equal(samples.length,3);
  assert.ok(Math.abs(samples[0].position.x)>3);
  assert.ok(Math.abs(samples[2].position.y)<.001);
  assert.ok(samples.every(x=>x.radius<8));
});
test('189: squeeze gait is deliberately smaller and slower',()=>{
  const input={time:0,position:{x:0,y:0},rootYaw:0,
    facingYaw:-Math.PI/2,travelYaw:0,speed:18,turning:0,
    posture:'stand',injury:0,down:false};
  const walk=gaitBounds({...input,gait:'walk'});
  const squeeze=gaitBounds({...input,gait:'squeeze'});
  assert.ok(squeeze.preferredLead<walk.preferredLead);
  assert.ok(squeeze.swingDuration>walk.swingDuration);
});
