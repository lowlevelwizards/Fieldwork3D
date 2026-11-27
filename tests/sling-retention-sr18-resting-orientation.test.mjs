import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {sampleRetentionPose} from '../src/breach-weapon-retention-pose.ts';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
const p={sling:'two',scale:new THREE.Vector3(1,1,1),heldPosition:new THREE.Vector3(8,0,0),heldQuaternion:new THREE.Quaternion(),primaryGrip:new THREE.Vector3(6,-3,1),supportGrip:new THREE.Vector3(15,-2,-1),balanceX:1,armorPush:0,pack:false,chestHeight:35,muzzleX:19.5,stockX:-13.5,bounds:new THREE.Box3(new THREE.Vector3(-12,-2,-1.6),new THREE.Vector3(18,2,1.6)),exterior:equipmentExterior('armor-bare','no-rig','combat-shirt')};
test('SR18 all settled orientations maintain an outward socket face and downward long axis independent of source roll',()=>{
 for(const [mode,normal] of [['front-slung',[1,0,0]],['side-slung',[0,0,1]],['back-slung',[-1,0,0]]]){
  const a=sampleRetentionPose({...p,mode});
  for(const roll of [-2,-1,0,1,2]){
   const b=sampleRetentionPose({...p,mode,heldQuaternion:new THREE.Quaternion().setFromEuler(new THREE.Euler(roll,.3,.6))});
   assert.ok(a.quaternion.angleTo(b.quaternion)<1e-6,mode);
   assert.ok(new THREE.Vector3(0,0,1).applyQuaternion(b.quaternion).dot(new THREE.Vector3(...normal))>.95,mode);
   assert.ok(new THREE.Vector3(1,0,0).applyQuaternion(b.quaternion).y<-.8,mode);
   assert.ok(a.position.distanceTo(b.position)<1e-6,mode);
  }
 }
});
