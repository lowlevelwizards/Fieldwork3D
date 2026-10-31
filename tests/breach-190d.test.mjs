import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceFootsteps,createFootstepScheduler,gaitBounds}
  from '../src/breach-footsteps.ts';
import {profileSamples,squeezeFacing}
  from '../src/breach-navigation.ts';

const input=gait=>({time:0,position:{x:220,y:208},
  rootYaw:-squeezeFacing(0),facingYaw:squeezeFacing(0),
  travelYaw:0,speed:0,turning:0,posture:'stand',injury:0,down:false,
  gait,footAllowed:()=>true});
const span=feet=>Math.hypot(feet[0].position.x-feet[1].position.x,
  feet[0].position.y-feet[1].position.y);
test('190D: planted feet narrow with actual shoulder-first passage gait',()=>{
  const walk=advanceFootsteps(createFootstepScheduler(),input('walk'));
  const tight=advanceFootsteps(createFootstepScheduler(),input('squeeze'));
  assert.ok(span(tight)>=4);
  assert.ok(span(tight)<span(walk));
  assert.ok(gaitBounds(input('squeeze')).comfortableLateral<
    gaitBounds(input('walk')).comfortableLateral);
});
test('190D: foot and body use the same sideways yaw and world axes',()=>{
  const a=input('squeeze');
  const points=profileSamples(a.position,a.facingYaw,'squeeze');
  assert.equal(points.length,3);
  assert.ok(Math.abs(points[2].position.y-points[0].position.y)<1e-6);
});
test('190D: a waypoint inside cover cannot expand body profile',()=>{
  const motor=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
  assert.match(motor,/if\(bodyClear\(a\.p,s\.doors\)\)\{\s*a\.squeeze=false/);
});
