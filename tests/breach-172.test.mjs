import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceFootsteps,createFootstepScheduler}
  from '../src/breach-footsteps.ts';
const input=(time,x=0,clear=()=>true)=>({
 time,position:{x,y:0},rootYaw:0,travelYaw:0,
 facingYaw:0,speed:40,turning:0,posture:'stand',injury:0,
 down:false,footAllowed:clear
});
test('172: unstable clearance never triggers simultaneous recovery steps',()=>{
 const state=createFootstepScheduler();
 advanceFootsteps(state,input(0));
 for(let tick=1;tick<140;tick++){
  const time=tick/60;
  const clear=(p)=>tick%8>2||p.x>1.5;
  const targets=advanceFootsteps(state,input(time,time*9,clear));
  assert.ok(state.feet.filter(f=>f.phase==='swinging').length<=1);
  assert.ok(targets.every(t=>Number.isFinite(t.position.x)&&
    Number.isFinite(t.position.y)));
  assert.equal(state.resets,1);
 }
});
test('172: no rig or IK path is allowed to secretly replace contacts',()=>{
 const rig=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
 assert.doesNotMatch(rig,/shoe\.recovery/);
 assert.doesNotMatch(rig,/const safe=safePlantPoint/);
 assert.doesNotMatch(rig,/rawTargets\.map/);
 assert.match(rig,/const targets:\[FootTarget,FootTarget\]=/);
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.doesNotMatch(scene,/Math\.hypot\(other\.p\.x-pt\.x/);
});
