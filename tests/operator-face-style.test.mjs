import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
const pose=faceStyle=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 equipment:initialEquipmentLoadout(),appearanceSeed:25,faceStyle
});
test('three face treatments do not alter body, sockets or head dimensions',()=>{
 const r=createOperatorRig('rook','blue');
 const headY=r.head.position.y;
 for(const face of ['blank','quiet','graphic']){
  poseOperator(r,pose(face),0);
  assert.equal(r.visualKit.eyeMarks.every(m=>m.visible),face==='quiet');
  assert.equal(r.visualKit.graphicMarks.visible,face==='graphic');
  assert.equal(r.head.position.y,headY);
 }
 assert.equal(r.visualKit.haircuts.length,3);
 assert.equal(r.visualKit.haircuts.filter(h=>h.visible).length,1);
 r.dispose();
});
