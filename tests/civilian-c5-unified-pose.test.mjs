import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {civilianPose} from '../src/breach-civilian-pose.ts';
import {createCivilianRig,updateCivilianRig}
 from '../src/breach-civilian-visuals.ts';
const actor=createCivilian({id:'civ:pose:1',role:'customer',
 persona:'steady',activity:'seated',position:{x:30,y:60},
 heading:0,roomId:'hall',appearanceSeed:33});
test('E5-C5 one pose resolver gives seated, moving and compliant identity',()=>{
 actor.state='routine';actor.health=2;actor.velocity=0;
 assert.equal(civilianPose(actor),'seated');
 const rig=createCivilianRig(actor);
 updateCivilianRig(rig,actor,1);
 assert.ok(rig.root.scale.y<1);
 assert.ok(rig.leftLeg.rotation.x>.5);
 actor.state='fleeing';actor.velocity=66;
 assert.equal(civilianPose(actor),'run');
 updateCivilianRig(rig,actor,2);
 assert.equal(rig.root.scale.y,1);
 actor.state='compliant';actor.velocity=0;
 assert.equal(civilianPose(actor),'compliant');
 updateCivilianRig(rig,actor,3);
 assert.equal(rig.leftLeg.rotation.x,0);
 assert.equal(rig.leftArm.position.y,30);
});
test('E5-C5 visible injury overrides idle or seated work animation',()=>{
 actor.activity='seated';actor.state='routine';actor.health=1;
 assert.equal(civilianPose(actor),'injured');
 actor.health=0;actor.state='incapacitated';
 assert.equal(civilianPose(actor),'down');
});
