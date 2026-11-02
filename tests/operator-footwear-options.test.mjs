import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
const pose=equipment=>({x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,equipment});
test('field and light footwear have separate geometry while leaving IK feet intact',()=>{
 const rig=createOperatorRig('rook','blue');
 const original=rig.feet.map(f=>f.shoe.geometry);
 const heavy=initialEquipmentLoadout();
 poseOperator(rig,pose(heavy),0);
 assert.ok(rig.visualKit.fieldToeCaps.every(x=>x.visible));
 assert.ok(rig.visualKit.lightInstepPanels.every(x=>!x.visible));
 const light=setEquipmentChoice(heavy,'feet','feet-light');
 poseOperator(rig,pose(light),0);
 assert.ok(rig.visualKit.fieldToeCaps.every(x=>!x.visible));
 assert.ok(rig.visualKit.lightInstepPanels.every(x=>x.visible));
 assert.ok(rig.feet.every((f,i)=>f.shoe.geometry===original[i]));
 rig.dispose();
});
