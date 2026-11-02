import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
const pose=equipment=>({x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,aiming:false,
 firing:false,turning:0,deterministic:true,equipment,appearanceSeed:11});
test('minimal face has two soft eye marks, no protruding cube nose',()=>{
 const r=createOperatorRig('rook','blue');
 assert.equal(r.visualKit.eyeMarks.length,2);
 const headMeshes=[];r.head.traverse(x=>{if(x.isMesh)headMeshes.push(x)});
 assert.ok(headMeshes.length>2);
 assert.ok(r.visualKit.eyeMarks.every(m=>m.geometry.boundingBox===null));
 let kit=setEquipmentChoice(initialEquipmentLoadout(),'head','head-none');
 poseOperator(r,pose(kit),0);
 assert.equal(r.visualKit.hair.visible,true);
 assert.equal(r.visualKit.helmet.visible,false);
 kit=setEquipmentChoice(kit,'head','head-cap');
 poseOperator(r,pose(kit),0);
 assert.equal(r.visualKit.cap.visible,true);
 assert.equal(r.visualKit.helmet.visible,false);
 kit=setEquipmentChoice(kit,'head','head-helmet');
 poseOperator(r,pose(kit),0);
 assert.equal(r.visualKit.helmet.visible,true);
 assert.equal(r.visualKit.cap.visible,false);
 r.dispose();
});
