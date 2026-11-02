import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true};
test('blank face and close fitting backpack do not change skeleton',()=>{
 const r=createOperatorRig('rook','blue');
 const headY=r.head.position.y;
 poseOperator(r,{...base,equipment:initialEquipmentLoadout()},0);
 assert.equal(r.visualKit.eyeMarks.some(x=>x.visible),false);
 assert.equal(r.visualKit.graphicMarks.visible,false);
 assert.ok(r.pack.position.x>-9);
 assert.equal(r.head.position.y,headY);
 const none=setEquipmentChoice(initialEquipmentLoadout(),'backpack','backpack-none');
 poseOperator(r,{...base,equipment:none},0);
 assert.equal(r.pack.visible,false);
 assert.equal(r.visualKit.packHarness.visible,false);
 r.dispose();
});
test('cap brim is not floating and headgear options remain exclusive',()=>{
 const r=createOperatorRig('rook','blue');
 let kit=setEquipmentChoice(initialEquipmentLoadout(),'head','head-cap');
 poseOperator(r,{...base,equipment:kit},0);
 assert.equal(r.visualKit.cap.visible,true);
 assert.equal(r.visualKit.helmet.visible,false);
 assert.equal(r.visualKit.hair.visible,false);
 kit=setEquipmentChoice(kit,'head','head-helmet');
 poseOperator(r,{...base,equipment:kit},0);
 assert.equal(r.visualKit.cap.visible,false);
 assert.equal(r.visualKit.helmet.visible,true);
 r.dispose();
});
