import test from 'node:test';
import assert from 'node:assert/strict';
import {horizontalLegReach,fitLandingToHip,LEG_UPPER_LENGTH,LEG_LOWER_LENGTH,LEG_HIP_SIDE} from '../src/breach-leg-geometry.ts';
import {gaitBounds,createFootstepScheduler,advanceFootsteps} from '../src/breach-footsteps.ts';
const input=(time,x)=>({time,position:{x,y:0},rootYaw:0,
  facingYaw:0,travelYaw:0,speed:42,turning:0,posture:'stand',
  injury:0,down:false,footAllowed:()=>true,gait:'walk'});
test('182: shared physical leg geometry defines real 3D reach',()=>{
  assert.ok(horizontalLegReach()>8);
  const hip={x:10,y:LEG_HIP_SIDE},goal={x:150,y:20};
  const actual=fitLandingToHip(goal,hip);
  assert.ok(Math.hypot(actual.x-hip.x,actual.y-hip.y)<=horizontalLegReach());
  assert.equal(LEG_UPPER_LENGTH,LEG_LOWER_LENGTH);
});
test('182: planned gait uses the same reach budget as IK',()=>{
  assert.equal(gaitBounds(input(0,0)).emergencyReach,horizontalLegReach());
  const s=createFootstepScheduler();
  for(let i=0;i<30;i++)advanceFootsteps(s,input(i/60,i*.7));
  assert.ok(s.initialized);
  for(const f of s.feet)assert.ok(Number.isFinite(f.swingTo.x));
});
