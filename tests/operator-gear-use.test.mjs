import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 equipment:initialEquipmentLoadout()};
test('treatment puts medical supplies in hand without a second stowed pouch',()=>{
 const rig=createOperatorRig('rook','blue');
 poseOperator(rig,{...base,treatmentActive:true,treatmentProgress:.5},0);
 assert.equal(rig.medicalPouch.visible,false);
 assert.equal(rig.medicalItem.visible,true);
 poseOperator(rig,{...base,treatmentActive:false},0);
 assert.equal(rig.medicalPouch.visible,true);
 assert.equal(rig.medicalItem.visible,false);
 rig.dispose();
});
test('radio follows the actual utility carry socket',()=>{
 const rig=createOperatorRig('rook','blue');
 poseOperator(rig,{...base,utilityCarryLocation:'backpack'},0);
 assert.equal(rig.radioUnit.parent,rig.pack);
 poseOperator(rig,{...base,utilityCarryLocation:'belt'},0);
 assert.equal(rig.radioUnit.parent,rig.hip);
 rig.dispose();
});
