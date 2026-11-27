import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialRetentionTransition,requestRetentionTransition,advanceRetentionTransition,retentionTransitionSettled,sampleRetentionTransition} from '../src/breach-weapon-retention-transition.ts';
import {sampleRetentionPose} from '../src/breach-weapon-retention-pose.ts';
const step=s=>advanceRetentionTransition(s,1/60,'two');
test('WR6 reversible fixed-step state preserves progress and moves between stows through held',()=>{
 let s=requestRetentionTransition(initialRetentionTransition(),'front-slung','two');
 for(let i=0;i<12;i++)s=step(s);
 const partial=s.weight;
 s=requestRetentionTransition(s,null,'two');assert.equal(s.weight,partial);
 s=step(s);assert.ok(s.weight<partial);
 s=requestRetentionTransition(s,'side-slung','two');
 assert.equal(s.mode,'front-slung');
 let passedHeld=false;
 for(let i=0;i<180;i++){s=step(s);if(s.mode===null)passedHeld=true;}
 assert.ok(passedHeld);assert.equal(s.mode,'side-slung');assert.ok(retentionTransitionSettled(s));
 assert.equal(requestRetentionTransition(initialRetentionTransition(),'back-slung','single').desired,null);
});
const input={mode:'front-slung',sling:'two',scale:new THREE.Vector3(.9,1,1),heldPosition:new THREE.Vector3(8,0,0),heldQuaternion:new THREE.Quaternion(),primaryGrip:new THREE.Vector3(6,-3,1),supportGrip:new THREE.Vector3(15,-2,-1),balanceX:1,armorPush:0,pack:false,chestHeight:26,muzzleX:19.5,stockX:-13.5};
test('WR6 pure replay samples match exact endpoints and preserve held-one grip',()=>{
 for(const mode of ['held-one','front-slung','side-slung','back-slung']){
  const p={...input,mode};
  const from=sampleRetentionTransition(p,0),to=sampleRetentionTransition(p,1);
  assert.ok(from.position.distanceTo(p.heldPosition)<1e-6);
  assert.ok(to.position.distanceTo(sampleRetentionPose(p).position)<1e-6);
  assert.deepEqual(sampleRetentionTransition(p,.43),sampleRetentionTransition(p,.43));
 }
 const p={...input,mode:'held-one'},sample=sampleRetentionTransition(p,.45);
 const grip=p.primaryGrip.clone().sub(p.heldPosition).applyQuaternion(sample.quaternion).add(sample.position);
 assert.ok(grip.distanceTo(sample.right)<1e-6);
});
