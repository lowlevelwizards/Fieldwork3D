import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {createCivilianRig,updateCivilianRig,CIVILIAN_ANATOMY}
 from '../src/breach-civilian-visuals.ts';

const make=()=>createCivilian({
 id:'civ:adult:sample',role:'visitor',persona:'steady',activity:'waiting',
 position:{x:16,y:22},heading:0,roomId:'room',appearanceSeed:2
});
const height=rig=>{
 const bounds=new THREE.Box3().setFromObject(rig.root);
 return {height:bounds.max.y-bounds.min.y,
   bottom:bounds.min.y,top:bounds.max.y};
};

test('adult civilian has ground-planted feet, long separate legs and visible hands',()=>{
 const c=make(),rig=createCivilianRig(c);
 updateCivilianRig(rig,c,0);
 const body=height(rig);
 assert.ok(body.height>42&&body.height<48,'standing height matches operators');
 assert.ok(body.bottom>-.5&&body.bottom<1,'shoes touch ground');
 assert.ok(CIVILIAN_ANATOMY.legLength>=18);
 assert.ok(CIVILIAN_ANATOMY.legLength/CIVILIAN_ANATOMY.standingHeadTop>.4);
 assert.equal(rig.leftShoe.parent,rig.leftLeg);
 assert.equal(rig.rightShoe.parent,rig.rightLeg);
 assert.ok(rig.leftArm.children.some(child=>child.isMesh),
   'hand is attached to the shoulder-pivoted arm');
 assert.equal(rig.leftLeg.position.y,CIVILIAN_ANATOMY.hipY);
 assert.equal(rig.leftArm.position.y,CIVILIAN_ANATOMY.shoulderY);
});
test('hiding crouches at hips; injury does not vertically shrink the person',()=>{
 const c=make(),rig=createCivilianRig(c);
 updateCivilianRig(rig,c,0);
 const standing=height(rig);
 c.state='hiding';c.velocity=0;
 updateCivilianRig(rig,c,1);
 const hidden=height(rig);
 assert.equal(rig.root.scale.y,1);
 assert.ok(hidden.height>standing.height*.78&&hidden.height<standing.height*.95,
   'crouched model stays recognizably adult-sized');
 assert.ok(rig.upper.position.y<0);
 assert.ok(rig.leftLeg.scale.y<1&&rig.rightLeg.scale.y<1);
 assert.ok(hidden.bottom>-.5&&hidden.bottom<1);
 c.health=1;c.injuryStage=1;c.state='wounded';
 updateCivilianRig(rig,c,2);
 const injured=height(rig);
 assert.equal(rig.root.scale.y,1);
 assert.equal(rig.upper.position.y,0);
 assert.equal(rig.leftLeg.scale.y,1);
 assert.ok(injured.height>standing.height*.95,
   'a wounded adult stays standing-height, no compressed geometry');
});
test('compliant hands raise above the head and replay rewind resets limb geometry',()=>{
 const c=make(),rig=createCivilianRig(c);
 updateCivilianRig(rig,c,.2);
 const standing=height(rig);
 c.state='compliant';
 updateCivilianRig(rig,c,.4);
 const surrender=height(rig);
 assert.ok(rig.leftArm.rotation.z< -2&&rig.rightArm.rotation.z>2);
 assert.ok(surrender.top>standing.top+2,
   'shoulder pivot raises visible hands above face');
 c.state='routine';
 updateCivilianRig(rig,c,.2);
 assert.equal(rig.upper.position.y,0);
 assert.equal(rig.leftArm.rotation.z,0);
 assert.equal(rig.leftLeg.scale.y,1);
 assert.equal(rig.root.rotation.z,0);
 assert.equal(rig.root.scale.y,1);
 assert.ok(Math.abs(height(rig).height-standing.height)<.001);
});
test('seated and prone render poses keep their full limb geometry and replay reset',()=>{
 const c=make(),rig=createCivilianRig(c);
 c.activity='seated';
 updateCivilianRig(rig,c,3);
 assert.ok(rig.upper.position.y<0);
 assert.ok(rig.leftLeg.rotation.x>0);
 assert.equal(rig.root.scale.y,1);
 c.health=0;c.injuryStage=3;c.state='incapacitated';
 updateCivilianRig(rig,c,4);
 assert.ok(rig.root.rotation.z>1);
 c.health=2;c.injuryStage=0;c.activity='waiting';c.state='routine';
 updateCivilianRig(rig,c,0);
 assert.equal(rig.leftLeg.rotation.x,0);
 assert.equal(rig.upper.position.y,0);
 assert.equal(rig.root.rotation.z,0);
 assert.equal(rig.leftShoe.scale.y,1);
});
