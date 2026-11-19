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
  const shown=Object.entries(rig.equipmentDetails.tools)
   .filter(([,g])=>g.visible).map(([name])=>name);
  if(id==='utility-wedge'){
   assert.deepEqual(shown,[], 'wedge packaging is no longer a decorative prop');
   assert.equal(rig.wedgeMeshes.filter(x=>x.visible).length,2);
  }else assert.deepEqual(shown,[id]);
 }
 poseOperator(rig,pose(setEquipmentChoice(initialEquipmentLoadout(),
  'utility','utility-radio')),0);
 assert.ok(Object.values(rig.equipmentDetails.tools).every(x=>!x.visible));
 assert.equal(rig.equipmentDetails.radioTrim.visible,true);
 rig.dispose();
});

test('medical kits and real carried tools stay on their chosen body mounts',()=>{
 const rig=createOperatorRig('moss','blue');
 try{
  const base=initialEquipmentLoadout();
  poseOperator(rig,{...pose(base),medicalCarryLocation:'belt',utilityCarryLocation:'belt'},0);
  assert.equal(rig.medicalPouch.parent,rig.hip);
  assert.equal(rig.radioUnit.parent,rig.hip);
  assert.equal(rig.medicalPouch.visible,true);
  assert.equal(rig.equipmentDetails.medicalMark.visible,true);
  assert.equal(rig.equipmentDetails.traumaHardware.visible,false);
  const trauma=setEquipmentChoice(base,'medical','medical-trauma');
  poseOperator(rig,{...pose(trauma),medicalCarryLocation:'backpack'},0);
  assert.equal(rig.medicalPouch.parent,rig.pack);
  assert.equal(rig.equipmentDetails.traumaHardware.visible,true);
  assert.ok(rig.medicalPouch.scale.x>1);
  const empty=setEquipmentChoice(base,'medical','medical-none');
  poseOperator(rig,{...pose(empty),medicalCarryLocation:'rig'},0);
  assert.equal(rig.medicalPouch.visible,false);
  assert.equal(rig.equipmentDetails.medicalMark.visible,false);
  assert.equal(rig.equipmentDetails.traumaHardware.visible,false);
 }finally{rig.dispose();}
});

test('long tools retain belt, pocket, rig or backpack carry identity',async()=>{
 const {utilityDisplaySocket}=await import('../src/equipment-carry-visuals.ts');
 for(const id of ['utility-breach','utility-pry','utility-cutter']){
  assert.equal(utilityDisplaySocket(id,'belt',true).bone,'hip');
  assert.equal(utilityDisplaySocket(id,'pocket',true).bone,'hip');
  assert.equal(utilityDisplaySocket(id,'rig',true).bone,'chest');
  assert.equal(utilityDisplaySocket(id,'backpack',true).bone,'pack');
  assert.equal(utilityDisplaySocket(id,'backpack',false).bone,'chest');
 }
 assert.equal(utilityDisplaySocket('utility-light','belt',true).bone,'hip');
 const rig=createOperatorRig('ash','blue');
 try{
  const kit=setEquipmentChoice(initialEquipmentLoadout(),'utility','utility-pry');
  poseOperator(rig,{...pose(kit),utilityCarryLocation:'belt'},0);
  assert.equal(rig.utilityTool.parent,rig.hip);
  poseOperator(rig,{...pose(kit),utilityCarryLocation:'backpack'},0);
  assert.equal(rig.utilityTool.parent,rig.pack);
 }finally{rig.dispose();}
});
