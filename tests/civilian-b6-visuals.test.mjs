import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {createCivilianRig,updateCivilianRig}
 from '../src/breach-civilian-visuals.ts';
const civilian=createCivilian({id:'civ:1:0',role:'employee',
 persona:'steady',activity:'working',position:{x:30,y:50},
 heading:0,roomId:'office',appearanceSeed:21});
test('E5-B6 cuboid silhouettes share materials and render without weapons',()=>{
 const rig=createCivilianRig(civilian);
 assert.equal(rig.root.name,'civilian-'+civilian.id);
 assert.ok(rig.root.children.length>=6);
 assert.equal(rig.root.children.some(x=>/gun|rifle|flash/i.test(x.name)),false);
 updateCivilianRig(rig,civilian,1);
 assert.equal(rig.root.position.x,30);
});
test('E5-B6 distinctive compliance, retreat and down poses are deterministic',()=>{
 const rig=createCivilianRig(civilian);
 civilian.state='compliant';
 updateCivilianRig(rig,civilian,2);
 assert.equal(rig.leftArm.position.y,30);
 civilian.state='hiding';
 updateCivilianRig(rig,civilian,3);
 assert.ok(rig.root.scale.y<1);
 civilian.state='incapacitated';
 updateCivilianRig(rig,civilian,4);
 assert.ok(rig.root.rotation.z>1);
});
