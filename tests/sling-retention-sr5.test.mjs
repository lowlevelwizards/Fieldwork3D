import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {sampleRetentionPose,retainedSwing} from '../src/breach-weapon-retention-pose.ts';
import {sampleRetentionTransition} from '../src/breach-weapon-retention-transition.ts';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
const input={mode:'front-slung',sling:'two',scale:new THREE.Vector3(1,1,1),heldPosition:new THREE.Vector3(8,0,0),heldQuaternion:new THREE.Quaternion(),primaryGrip:new THREE.Vector3(6,-3,1),supportGrip:new THREE.Vector3(15,-2,-1),balanceX:1,armorPush:0,pack:false,chestHeight:35,muzzleX:19.5,stockX:-13.5};
test('SR5 front drop preserves the source twist for high, low and neutral presentation',()=>{
 for(const pitch of [-.9,0,.9]){
  const p={...input,heldQuaternion:new THREE.Quaternion().setFromEuler(new THREE.Euler(.18,.2,pitch))};
  const target=sampleRetentionPose(p);
  const axis=new THREE.Vector3(1,0,0).applyQuaternion(target.quaternion);
  assert.ok(axis.y<-.8);
  assert.ok(target.quaternion.angleTo(retainedSwing(p.heldQuaternion,axis))<1e-6);
  const middle=sampleRetentionTransition(p,.5);
  assert.ok(middle.quaternion.angleTo(p.heldQuaternion)<target.quaternion.angleTo(p.heldQuaternion)+1e-6);
 }
});
