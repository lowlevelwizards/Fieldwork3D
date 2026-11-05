import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {civilianPose} from '../src/breach-civilian-pose.ts';
import {createCivilianRig,updateCivilianRig}
 from '../src/breach-civilian-visuals.ts';
const person=()=>createCivilian({id:'civ:r2:c1',role:'employee',persona:'steady',
 activity:'working',position:{x:30,y:50},heading:0,
 roomId:'site',appearanceSeed:21});
test('R2-C1 ambulatory injured escort uses gait and stops without stale transforms',()=>{
 const c=person(),rig=createCivilianRig(c);
 c.health=1;c.injuryStage=1;c.state='escorted';c.velocity=22;
 assert.equal(civilianPose(c),'injured-walk');
 updateCivilianRig(rig,c,.25);
 assert.ok(rig.root.scale.y<1);
 assert.notEqual(rig.leftLeg.rotation.x,0);
 c.velocity=0;updateCivilianRig(rig,c,.7);
 assert.equal(civilianPose(c),'injured');
 assert.equal(rig.leftLeg.rotation.x,0);
});
test('R2-C1 carry and drag poses are different and restore down after release',()=>{
 const c=person(),rig=createCivilianRig(c);
 c.health=0;c.state='incapacitated';c.injuryStage=3;
 c.carriedById='rook';c.transportMode='carry';
 assert.equal(civilianPose(c),'carried');
 updateCivilianRig(rig,c,2);
 assert.ok(rig.root.position.y>3);
 c.transportMode='drag';updateCivilianRig(rig,c,2.5);
 assert.equal(civilianPose(c),'dragged');
 assert.ok(rig.root.rotation.z>1);
 c.carriedById=null;c.transportMode=null;
 updateCivilianRig(rig,c,1);
 assert.equal(civilianPose(c),'down');
 assert.equal(rig.root.position.y,3);
});
test('R2-C1 employee silhouette adds one low-cost shared cuboid apron',()=>{
 assert.ok(createCivilianRig(person()).root.children.length>=9);
});
