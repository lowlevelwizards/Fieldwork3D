import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
const p=(locations=[],medicalCarryLocation=undefined)=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 equipment:initialEquipmentLoadout(),
 magazineCarryLocations:locations,medicalCarryLocation
});
test('empty rig decorative holders are replaced by actual magazines',()=>{
 const rig=createOperatorRig('rook','blue');
 poseOperator(rig,p(),0);
 assert.equal(rig.rigPouches[0].visible,true);
 poseOperator(rig,p(['rig','belt']),0);
 assert.ok(rig.rigPouches.every(x=>!x.visible));
 assert.equal(rig.beltPouch.visible,false);
 assert.equal(rig.visualKit.magazines.rig.filter(x=>x.visible).length,1);
 poseOperator(rig,p([],'belt'),0);
 assert.equal(rig.beltPouch.visible,false);
 rig.dispose();
});
