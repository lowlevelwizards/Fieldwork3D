import test from 'node:test';
import assert from 'node:assert/strict';
import {gaitBounds,createFootstepScheduler,advanceFootsteps} from '../src/breach-footsteps.ts';
const make=(time,x,speed=53,gait='walk')=>({time,position:{x,y:0},
  rootYaw:0,facingYaw:0,travelYaw:0,speed,turning:0,
  posture:'stand',injury:0,down:false,gait,footAllowed:()=>true});
test('183: active movement has shorter transfer than deliberate pie',()=>{
  const walk=gaitBounds(make(0,0));
  const run=gaitBounds(make(0,0,72,'run'));
  const pie=gaitBounds(make(0,0,8,'pie'));
  assert.ok(walk.swingDuration<pie.swingDuration);
  assert.ok(run.swingDuration<=walk.swingDuration);
  assert.ok(walk.preferredLead<run.preferredLead);
});
test('183: no spurious resets when continuous motor travel advances',()=>{
  const s=createFootstepScheduler();
  for(let i=0;i<110;i++){
    advanceFootsteps(s,make(i/60,i*53/60));
  }
  assert.equal(s.resets,1);
  assert.ok(s.lastStepAt>0);
  for(const foot of s.feet){
    assert.ok(Number.isFinite(foot.plantedAt.x));
    assert.ok(Number.isFinite(foot.swingTo.x));
  }
});
