import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePoseLocomotionFrame} from '../src/breach-pose-locomotion-frame.ts';
const base={x:20,z:30,heading:0,velocity:60,posture:'stand',down:false};
test('forward motion aligns pelvis with travel, reverse and strafe preserve facing',()=>{
 const forward=resolvePoseLocomotionFrame({...base,travelYaw:.2},null);
 const lateral=resolvePoseLocomotionFrame({...base,travelYaw:Math.PI/2},null);
 const reverse=resolvePoseLocomotionFrame({...base,travelYaw:Math.PI},null);
 assert.equal(forward.hipTarget,.2);
 assert.equal(lateral.hipTarget,0);
 assert.equal(reverse.hipTarget,0);
});
test('blocked or down pose does not invent locomotion',()=>{
 const blocked=resolvePoseLocomotionFrame({...base,blocked:true,travelYaw:1},null);
 const down=resolvePoseLocomotionFrame({...base,down:true,travelYaw:1},null);
 assert.equal(blocked.physicalSpeed,0);
 assert.equal(blocked.moving,0);
 assert.equal(down.moving,0);
 assert.equal(down.hipTarget,base.heading);
});
test('recorded travel direction and partial crouch are deterministic',()=>{
 const actual=resolvePoseLocomotionFrame({...base,travelYaw:undefined,interactionCrouch:.5,acceleration:-90},{x:10,z:30});
 assert.equal(actual.direction,0);
 assert.equal(actual.crouch,4);
 assert.equal(actual.braking,.5);
 const crouched=resolvePoseLocomotionFrame({...base,posture:'crouch'},null);
 assert.equal(crouched.crouch,8);
});
