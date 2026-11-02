import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
test('signed deterministic appearance seeds retain valid colors and hair',()=>{
 const rig=createOperatorRig('rook','blue');
 for(const seed of [-1,-12,-2147483648,0,1,2147483647]){
  poseOperator(rig,{x:0,z:0,heading:0,velocity:0,seconds:0,
   stride:0,posture:'stand',injury:0,weapon:'carbine',reload:0,
   reloadDuration:0,lastDoorAt:-100,lastThrowAt:-100,down:false,
   surrender:false,aiming:false,firing:false,turning:0,
   deterministic:true,appearanceSeed:seed,equipment:initialEquipmentLoadout()},0);
  assert.equal(rig.visualKit.haircuts.filter(h=>h.visible).length,1);
  for(const material of [rig.clothMaterial,rig.vestMaterial,
   rig.visualKit.hairMaterial,rig.visualKit.patchMaterial])
   assert.ok(Number.isFinite(material.color.r+material.color.g+material.color.b));
 }
 rig.dispose();
});
