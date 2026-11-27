import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {sampleRetentionPose} from '../src/breach-weapon-retention-pose.ts';
import {sampleRetentionTransition} from '../src/breach-weapon-retention-transition.ts';
const input={mode:'front-slung',sling:'two',scale:new THREE.Vector3(1,1,1),heldPosition:new THREE.Vector3(8,0,0),heldQuaternion:new THREE.Quaternion(),primaryGrip:new THREE.Vector3(6,-3,1),supportGrip:new THREE.Vector3(15,-2,-1),balanceX:1,armorPush:0,pack:false,chestHeight:35,muzzleX:19.5,stockX:-13.5};
test('SR5 front drop has a stable resting plane and a continuous source swing',()=>{
 let reference;
 for(const pitch of [-.9,0,.9]){
  const p={...input,heldQuaternion:new THREE.Quaternion().setFromEuler(new THREE.Euler(.18,.2,pitch))};
  const target=sampleRetentionPose(p);
  const axis=new THREE.Vector3(1,0,0).applyQuaternion(target.quaternion);
  assert.ok(axis.y<-.8);
  const face=new THREE.Vector3(0,0,1).applyQuaternion(target.quaternion);
  assert.ok(face.x>.95);
  if(reference)assert.ok(target.quaternion.angleTo(reference)<1e-6);
  reference=target.quaternion;
  let previous=sampleRetentionTransition(p,0).quaternion;
  for(let i=1;i<=100;i++){
   const q=sampleRetentionTransition(p,i/100).quaternion;
   assert.ok(q.angleTo(previous)<.16);
   previous=q;
  }
  assert.ok(previous.angleTo(target.quaternion)<1e-6);
 }
});
