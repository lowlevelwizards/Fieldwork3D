import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {sampleRetentionPose} from '../src/breach-weapon-retention-pose.ts';
import {solveUnifiedRetentionArm} from '../src/breach-unified-upper-body.ts';
import {poseClearanceEnvelope} from '../src/breach-pose-clearance-envelope.ts';
import {createOperatorPoseScratch} from '../src/breach-operator-pose-scratch.ts';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
const p={mode:'side-slung',sling:'two',scale:new THREE.Vector3(1,1,1),heldPosition:new THREE.Vector3(8,0,0),heldQuaternion:new THREE.Quaternion(),primaryGrip:new THREE.Vector3(6,-3,1),supportGrip:new THREE.Vector3(15,-2,-1),balanceX:1,armorPush:0,pack:false,chestHeight:35,muzzleX:19.5,stockX:-13.5,bounds:new THREE.Box3(new THREE.Vector3(-12,-2,-1.6),new THREE.Vector3(18,2,1.6))};
test('SR18 side carry remains between torso and released right arm across representative kits',()=>{
 for(const [a,r,t] of [['armor-bare','no-rig','combat-shirt'],['plate-heavy','full-chest','gorka-jacket'],['plate-jpc','chest-placard','bdu-shirt']]){
  const exterior=equipmentExterior(a,r,t),s=sampleRetentionPose({...p,exterior});
  const shoulder=new THREE.Vector3(1,4,7);
  const arm=solveUnifiedRetentionArm({shoulder,desired:s.right,sourcePole:new THREE.Vector3(4,-9,1),release:1,side:1,outboardStow:true,envelope:poseClearanceEnvelope(a,r,t),scratch:createOperatorPoseScratch(),armIndex:1}).solution;
  assert.ok(s.right.z>s.position.z+.5,a);
  assert.ok(arm.joint.z>s.position.z-.5,a);
  assert.ok(arm.joint.z-shoulder.z<5.5,a);
  assert.ok(s.right.y<-12,a);
  assert.ok(arm.effector.z>s.position.z,a);
  assert.ok(Math.abs(arm.joint.distanceTo(shoulder)-10)<1e-6,a);
  assert.ok(Math.abs(arm.effector.distanceTo(arm.joint)-10)<1e-6,a);
 }
});
