import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyLocomotion,uncrossed} from '../src/breach-locomotion.ts';
import {createFootstepScheduler,advanceFootsteps} from '../src/breach-footsteps.ts';

test('123: lateral movement retains side-specific modes',()=>{
 assert.equal(classifyLocomotion(35,0,Math.PI/2,0),'strafe-right');
 assert.equal(classifyLocomotion(35,0,-Math.PI/2,0),'strafe-left');
 assert.equal(classifyLocomotion(35,0,Math.PI,0),'backward');
 assert.equal(classifyLocomotion(35,0,0,0),'forward');
});
test('123: left and right shuffle paths never cross, even at arbitrary stops',()=>{
 for(const sign of [-1,1]){
  for(const stopping of [.18,.38,.56,.9,1.28,2.0,2.7]){
   const state=createFootstepScheduler();let crossings=0,steps=0;
   for(let frame=0;frame<=340;frame++){
    const t=frame/60,active=t<stopping,z=sign*Math.min(t,stopping)*28;
    const targets=advanceFootsteps(state,{
      time:t,position:{x:0,y:z},rootYaw:0,facingYaw:0,
      travelYaw:sign*Math.PI/2,speed:active?28:0,
      turning:0,posture:'stand',injury:0,down:false
    });
    if(targets.some(f=>!f.contact))steps++;
    if(!uncrossed(targets[0].position,targets[1].position,0,3.6))
      crossings++;
   }
   assert.equal(crossings,0,'crossed '+sign+' stop '+stopping);
   assert.ok(steps>0,'no shuffle '+sign+' '+stopping);
   assert.ok(uncrossed(state.feet[0].plantedAt,
     state.feet[1].plantedAt,0,3.6));
  }
 }
});
test('123: left-right reversal never swaps feet',()=>{
 const state=createFootstepScheduler();let z=0;
 for(let i=0;i<420;i++){
  const t=i/60,sign=t<2?1:-1;
  z+=sign*25/60;
  const f=advanceFootsteps(state,{time:t,position:{x:0,y:z},
   rootYaw:0,facingYaw:0,travelYaw:sign*Math.PI/2,
   speed:25,turning:0,posture:'stand',injury:0,down:false});
  assert.ok(uncrossed(f[0].position,f[1].position,0,3.6));
 }
});
