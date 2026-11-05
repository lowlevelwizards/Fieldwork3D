import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {createCivilianRig,updateCivilianRig}
 from '../src/breach-civilian-visuals.ts';
const make=()=>createCivilian({id:'civ:pose',role:'employee',
 persona:'steady',activity:'working',position:{x:44,y:60},
 heading:0,roomId:'r',appearanceSeed:9});
test('E5-C1a reverse replay and compliance reset all pose transforms',()=>{
 const actor=make(),rig=createCivilianRig(actor);
 actor.velocity=33;
 updateCivilianRig(rig,actor,.2);
 assert.notEqual(rig.leftLeg.rotation.x,0);
 actor.velocity=0;actor.state='compliant';
 updateCivilianRig(rig,actor,.3);
 assert.equal(rig.leftLeg.rotation.x,0);
 assert.equal(rig.rightLeg.rotation.x,0);
 assert.equal(rig.leftArm.rotation.x,0);
 assert.equal(rig.leftArm.position.y,30);
 actor.state='incapacitated';actor.health=0;
 updateCivilianRig(rig,actor,.5);
 assert.ok(rig.root.rotation.z>1);
 actor.state='routine';actor.health=2;
 updateCivilianRig(rig,actor,.1);
 assert.equal(rig.root.rotation.z,0);
 assert.equal(rig.root.position.y,0);
 assert.equal(rig.root.scale.y,1);
 assert.equal(rig.leftArm.position.y,19);
 assert.equal(rig.rightArm.position.y,19);
 assert.equal(rig.leftArm.rotation.z,0);
});
test('E5-C1a hiding to startled clears previously animated gait',()=>{
 const actor=make(),rig=createCivilianRig(actor);
 actor.state='fleeing';actor.velocity=66;
 updateCivilianRig(rig,actor,.21);
 assert.notEqual(rig.rightLeg.rotation.x,0);
 actor.state='hiding';actor.velocity=0;
 updateCivilianRig(rig,actor,.25);
 assert.equal(rig.rightLeg.rotation.x,0);
 assert.equal(rig.leftLeg.rotation.x,0);
 assert.ok(rig.root.scale.y<1);
 actor.state='startled';
 updateCivilianRig(rig,actor,.30);
 assert.equal(rig.root.scale.y,1);
 assert.equal(rig.rightArm.rotation.x,0);
});
