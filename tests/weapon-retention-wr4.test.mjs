import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sampleRetentionPose} from '../src/breach-weapon-retention-pose.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
const input={mode:'front-slung',sling:'two',scale:new THREE.Vector3(.9,1,1),heldPosition:new THREE.Vector3(8,0,0),heldQuaternion:new THREE.Quaternion(),primaryGrip:new THREE.Vector3(6,-3,1),supportGrip:new THREE.Vector3(15,-2,-1),balanceX:1,armorPush:0,pack:false,chestHeight:26,muzzleX:19.5,stockX:-13.5};
test('WR4 locations differ and never pretend an unsupported sling exists',()=>{
 const samples=['held-one','front-slung','side-slung','back-slung'].map(mode=>sampleRetentionPose({...input,mode}));
 assert.ok(samples.every(x=>x&&Math.abs(x.quaternion.length()-1)<1e-6));
 assert.ok(samples[1].position.x>samples[3].position.x);
 assert.equal(sampleRetentionPose({...input,sling:'none'}),null);
 assert.equal(sampleRetentionPose({...input,sling:'single',mode:'back-slung'}),null);
 const held=samples[0];
 const local=input.primaryGrip.clone().sub(input.heldPosition);
 assert.ok(local.applyQuaternion(held.quaternion).add(held.position).distanceTo(held.right)<1e-6);
});
test('WR4 explicit retention audition moves the single existing primary through the atomic pose pipeline',()=>{
 const rig=createOperatorRig('rook','blue');
 const config=setWeaponAttachment(initialWeaponConfiguration('carbine'),'sling','sling-two-point');
 const p={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,aiming:false,firing:false,turning:0,weaponConfiguration:config,deterministic:true};
 poseOperator(rig,p,0);const before=rig.weapon.position.clone();
 poseOperator(rig,{...p,retentionPreview:'side-slung'},0);
 assert.ok(rig.weapon.visible&&!rig.droppedGun.visible);
 assert.ok(rig.weapon.position.distanceTo(before)>1);
 poseOperator(rig,p,0);assert.ok(rig.weapon.position.distanceTo(before)<1e-4);
 rig.dispose();
});
