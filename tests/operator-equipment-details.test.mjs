import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
const pose=(equipment)=>({x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,equipment});
test('each entry tool uses its own recognisable detail without replacing inventory',()=>{
 const rig=createOperatorRig('rook','blue');
 for(const id of ['utility-light','utility-pry','utility-breach',
  'utility-cutter','utility-wedge']){
  const kit=setEquipmentChoice(initialEquipmentLoadout(),'utility',id);
  poseOperator(rig,pose(kit),0);
  assert.deepEqual(Object.entries(rig.equipmentDetails.tools)
   .filter(([,g])=>g.visible).map(([name])=>name),[id]);
 }
 poseOperator(rig,pose(setEquipmentChoice(initialEquipmentLoadout(),
  'utility','utility-radio')),0);
 assert.ok(Object.values(rig.equipmentDetails.tools).every(x=>!x.visible));
 assert.equal(rig.equipmentDetails.radioTrim.visible,true);
 rig.dispose();
});
