import test from 'node:test';
import assert from 'node:assert/strict';
import {utilityDisplaySocket,equipmentCarrySocket} from '../src/equipment-carry-visuals.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true};
test('long equipment clears thigh and chooses rear carry when pack exists',()=>{
 for(const id of ['utility-breach','utility-pry','utility-cutter']){
  const s=utilityDisplaySocket(id,'belt',true);
  assert.equal(s.bone,'pack');
  assert.ok(Math.abs(s.z)>8);
  const without=utilityDisplaySocket(id,'belt',false);
  assert.equal(without.bone,'chest');
  assert.ok(without.x < -6);
 }
 assert.deepEqual(utilityDisplaySocket('utility-radio','belt',true),
  equipmentCarrySocket('utility','belt'));
});
test('runtime long equipment changes display parent but not kit identity',()=>{
 const r=createOperatorRig('rook','blue');
 let kit=setEquipmentChoice(initialEquipmentLoadout(),'utility','utility-breach');
 poseOperator(r,{...base,equipment:kit,utilityCarryLocation:'belt'},0);
 assert.equal(r.utilityTool.parent,r.pack);
 kit=setEquipmentChoice(kit,'backpack','backpack-none');
 poseOperator(r,{...base,equipment:kit,utilityCarryLocation:'belt'},0);
 assert.equal(r.utilityTool.parent,r.chest);
 assert.equal(kit.slots.utility,'utility-breach');
 r.dispose();
});
