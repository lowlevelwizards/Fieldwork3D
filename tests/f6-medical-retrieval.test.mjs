import test from 'node:test';
import assert from 'node:assert/strict';
import {medicalRetrievalPhase}
 from '../src/breach-medical-retrieval.ts';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout}
 from '../src/equipment-loadouts.ts';

const pose=(progress,active=true)=>({
 x:0,z:0,heading:0,velocity:0,seconds:4+progress,stride:0,
 posture:'stand',injury:0,weapon:'carbine',
 reload:0,reloadDuration:1,lastThrowAt:-100,lastDoorAt:-100,
 down:false,surrender:false,aiming:false,firing:false,
 turning:0,deterministic:true,poseV3Preview:true,
 poseV4ReloadPreview:true,poseDiagnostics:false,
 treatmentActive:active,treatmentProgress:progress,
 treatmentPoint:{x:12,y:0},medicalCarryLocation:'belt',
 equipment:initialEquipmentLoadout('carbine')
});
test('F6.5A: phase follows existing treatment progress, no separate timer',()=>{
 assert.deepEqual(medicalRetrievalPhase(0),
  {reach:0,apply:0,itemInHand:false});
 const reached=medicalRetrievalPhase(.18);
 assert.equal(reached.reach,1);assert.equal(reached.itemInHand,true);
 assert.equal(reached.apply>0,true);
 const done=medicalRetrievalPhase(.6);
 assert.equal(done.apply,1);
 assert.deepEqual(medicalRetrievalPhase(.6),done);
 assert.equal(medicalRetrievalPhase(NaN).itemInHand,false);
});
test('F6.5A: medical pouch remains mounted while a single dressing is retrieved',()=>{
 const rig=createOperatorRig('f6-medical','blue',true);
 try{
  poseOperator(rig,pose(.02),0);
  assert.equal(rig.medicalPouch.visible,true,
   'carrier must not disappear at treatment start');
  assert.equal(rig.medicalItem.visible,false,
   'dressing is not in hand before the pouch contact');
  poseOperator(rig,pose(.25),0);
  assert.equal(rig.medicalPouch.visible,true);
  assert.equal(rig.medicalItem.visible,true);
  poseOperator(rig,pose(.9),0);
  assert.equal(rig.medicalItem.visible,true);
  poseOperator(rig,pose(0,false),0);
  assert.equal(rig.medicalPouch.visible,true);
  assert.equal(rig.medicalItem.visible,false);
 }finally{rig.dispose();}
});
