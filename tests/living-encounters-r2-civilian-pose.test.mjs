import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {civilianPose} from '../src/breach-civilian-pose.ts';
import {createCivilianRig,updateCivilianRig} from '../src/breach-civilian-visuals.ts';
const person=()=>createCivilian({id:'civ:le:r2',role:'guest',persona:'startled',
 activity:'waiting',position:{x:40,y:40},heading:0,
 roomId:'guest-room',appearanceSeed:51});

test('LE4: a temporarily blocked fleeing person never appears calm',()=>{
 const c=person(),rig=createCivilianRig(c);
 c.state='fleeing';c.velocity=0;
 assert.equal(civilianPose(c),'startled');
 updateCivilianRig(rig,c,4);
 assert.notEqual(rig.leftArm.rotation.z,0);
 c.velocity=66;
 assert.equal(civilianPose(c),'run');
 updateCivilianRig(rig,c,4.2);
 assert.notEqual(rig.leftLeg.rotation.x,0);
 c.velocity=0;
 updateCivilianRig(rig,c,3.2);
 assert.equal(rig.leftLeg.rotation.x,0,'rewind removes old running stride');
});

test('LE4: a person traveling to a refuge uses gait until truly stationary',()=>{
 const c=person(),rig=createCivilianRig(c);
 c.state='hiding';c.goal={x:100,y:40};c.velocity=37;
 assert.equal(civilianPose(c),'walk');
 updateCivilianRig(rig,c,1.2);
 assert.equal(rig.root.scale.y,1,'a moving person is not a shrinking mannequin');
 assert.notEqual(rig.leftLeg.rotation.x,0);
 c.velocity=0;c.goal=null;
 assert.equal(civilianPose(c),'hide');
 updateCivilianRig(rig,c,.5);
 assert.ok(rig.root.scale.y<1);
 assert.equal(rig.leftLeg.rotation.x,0);
});
