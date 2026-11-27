import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {sampleRetentionPose,retainedSwing} from '../src/breach-weapon-retention-pose.ts';
import {sampleRetentionTransition} from '../src/breach-weapon-retention-transition.ts';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
const input={mode:'front-slung',sling:'two',scale:new THREE.Vector3(1,1,1),heldPosition:new THREE.Vector3(8,0,0),heldQuaternion:new THREE.Quaternion(),primaryGrip:new THREE.Vector3(6,-3,1),supportGrip:new THREE.Vector3(15,-2,-1),balanceX:1,armorPush:0,pack:false,chestHeight:35,muzzleX:19.5,stockX:-13.5};
test('SR6 side carry has a body-side center and avoids an extra axial roll',()=>{
 const p={...input,mode:'side-slung',exterior:equipmentExterior('armor-bare','no-rig','combat-shirt')};
 const target=sampleRetentionPose(p);
 const axis=new THREE.Vector3(1,0,0).applyQuaternion(target.quaternion);
 assert.ok(axis.y<-.95);
 assert.ok(target.position.x>0&&target.position.x<4);
 assert.ok(target.position.z<10);
 assert.ok(target.quaternion.angleTo(retainedSwing(p.heldQuaternion,axis))<1e-6);
});
