import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceFootsteps,createFootstepScheduler,gaitBounds}
  from '../src/breach-footsteps.ts';
import {profileSamples,squeezeFacing}
  from '../src/breach-navigation.ts';

const sample=(gait)=>({time:0,position:{x:220,y:208},
  rootYaw:-squeezeFacing(0),facingYaw:squeezeFacing(0),
  travelYaw:0,speed:0,turning:0,posture:'stand',injury:0,down:false,
  gait,footAllowed:()=>true});
test('190C: real squeeze foot targets have a narrower stance',()=>{
  const normal=advanceFootsteps(createFootstepScheduler(),sample('walk'));
  const narrow=advanceFootsteps(createFootstepScheduler(),sample('squeeze'));
  const gap=feet=>Math.hypot(
    feet[0].position.x-feet[1].position.x,
    feet[0].position.y-feet[1].position.y);
  assert.ok(gap(narrow)<gap(normal));
  assert.ok(gap(narrow)>4);
  assert.ok(gaitBounds(sample('squeeze')).comfortableLateral<
    gaitBounds(sample('walk')).comfortableLateral);
});
test('190C: body and feet use consistent orientation',()=>{
  const input=sample('squeeze');
  const pts=profileSamples(input.position,input.facingYaw,'squeeze');
  assert.equal(pts.length,3);
  assert.ok(Math.abs(pts[0].position.y-pts[2].position.y)<.001);
});
test('190C: no legacy limbs or redundant stride phases remain',()=>{
  const rig=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
  assert.doesNotMatch(rig,/legacyLegs|legacyArms|stridePhase/);
  const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
  assert.doesNotMatch(scene,/physical\.legacyLegs|physical\.legacyArms/);
});
