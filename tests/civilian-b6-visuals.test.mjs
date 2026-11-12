import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {createCivilianRig,updateCivilianRig,CIVILIAN_ANATOMY}
 from '../src/breach-civilian-visuals.ts';
const civilian=createCivilian({id:'civ:1:0',role:'employee',
 persona:'steady',activity:'working',position:{x:30,y:50},
 heading:0,roomId:'office',appearanceSeed:21});
test('E5-B6 cuboid silhouettes share materials and render without weapons',()=>{
 const rig=createCivilianRig(civilian);
 assert.equal(rig.root.name,'civilian-'+civilian.id);
 const meshes=[];rig.root.traverse(part=>{if(part.isMesh)meshes.push(part);});
 assert.ok(meshes.length>=10,'full body with hands and articulated footwear');
 assert.equal(meshes.some(x=>/gun|rifle|flash/i.test(x.name)),false);
 updateCivilianRig(rig,civilian,1);
 assert.equal(rig.root.position.x,30);
});
test('E5-B6 distinctive compliance, retreat and down poses are deterministic',()=>{
 const rig=createCivilianRig(civilian);
 civilian.state='compliant';
 updateCivilianRig(rig,civilian,2);
 assert.equal(rig.leftArm.position.y,CIVILIAN_ANATOMY.shoulderY);
 assert.ok(rig.leftArm.rotation.z< -2,'arms raise from shoulders');
 civilian.state='hiding';
 updateCivilianRig(rig,civilian,3);
 assert.ok(rig.upper.position.y<0,'hiding lowers hips instead of shrinking the person');
 assert.equal(rig.root.scale.y,1);
 civilian.state='incapacitated';
 updateCivilianRig(rig,civilian,4);
 assert.ok(rig.root.rotation.z>1);
});
