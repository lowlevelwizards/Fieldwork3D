import test from 'node:test';import assert from 'node:assert/strict';
import {handlingPose,fitWeaponPose} from '../src/breach-weapon-pose.ts';
const mode=(aim,moving,obstruction=false,friendlyNear=false)=>
 handlingPose({aim,moving,obstruction,friendlyNear});
test('164: contextual weapon states choose a real resting Ready stance',()=>{
 assert.equal(mode(0,0),'ready');
 assert.equal(mode(0,.6),'low');
 assert.equal(mode(.5,.6),'point');
 assert.equal(mode(1,0),'ads');
 assert.equal(mode(.25,0,true),'short');
 assert.equal(mode(.1,0,false,true),'low');
});
test('164: live gun pitch changes continuously with aim, not hard switches',()=>{
 let previous=null,maxAngle=0;
 for(let i=0;i<=100;i++){
  const aim=i/100,handling=mode(aim,0);
  const fit=fitWeaponPose({weapon:'carbine',handling,yaw:0,
   recoil:0,aimBlend:aim});
  assert.ok(Number.isFinite(fit.rotation.z));
  if(previous!==null)
   maxAngle=Math.max(maxAngle,Math.abs(fit.rotation.z-previous));
  previous=fit.rotation.z;
 }
 assert.ok(maxAngle<.18,'aim controller should not make abrupt muzzle swings');
});