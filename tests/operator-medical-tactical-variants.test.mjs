import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
const pose=(equipment,flashCharges=1)=>({x:0,z:0,heading:0,
 velocity:0,seconds:0,stride:0,posture:'stand',injury:0,weapon:'carbine',
 reload:0,reloadDuration:0,lastDoorAt:-100,lastThrowAt:-100,
 down:false,surrender:false,aiming:false,firing:false,turning:0,
 deterministic:true,equipment,flashCharges,appearanceSeed:12});
test('tactical smoke and flash have mutually exclusive hardware',()=>{
 const r=createOperatorRig('rook','blue');
 let gear=initialEquipmentLoadout();
 poseOperator(r,pose(gear),0);
 assert.equal(r.equipmentDetails.flashHardware.visible,true);
 assert.equal(r.equipmentDetails.smokeHardware.visible,false);
 poseOperator(r,pose(gear,0),0);
 assert.equal(r.flashCanister.visible,false);
 gear=setEquipmentChoice(gear,'tactical','tactical-smoke');
 poseOperator(r,pose(gear,0),0);
 assert.equal(r.flashCanister.visible,true);
 assert.equal(r.equipmentDetails.flashHardware.visible,false);
 assert.equal(r.equipmentDetails.smokeHardware.visible,true);
 gear=setEquipmentChoice(gear,'tactical','tactical-none');
 poseOperator(r,pose(gear),0);
 assert.equal(r.flashCanister.visible,false);
 r.dispose();
});
test('trauma kit visibly differs from first aid, and costume materials are included',()=>{
 const r=createOperatorRig('rook','blue');
 let gear=initialEquipmentLoadout();
 poseOperator(r,pose(gear),0);
 assert.equal(r.equipmentDetails.traumaHardware.visible,false);
 const allMaterials=new Set();
 r.root.traverse(obj=>{
  if(obj.isMesh&&obj.material?.isMeshStandardMaterial)allMaterials.add(obj.material);
 });
 assert.ok([...allMaterials].every(mat=>r.colors.has(mat)));
 gear=setEquipmentChoice(gear,'medical','medical-trauma');
 poseOperator(r,pose(gear),0);
 assert.equal(r.equipmentDetails.traumaHardware.visible,true);
 r.dispose();
});
