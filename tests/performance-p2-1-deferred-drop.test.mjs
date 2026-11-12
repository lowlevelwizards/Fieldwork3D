import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';

const baseline=(weapon='carbine',weaponConfiguration=undefined)=>({
 x:40,z:50,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon,weaponConfiguration,
 reload:0,reloadDuration:1.8,
 lastThrowAt:-100,lastDoorAt:-100,
 down:false,surrender:false,aiming:false,
 firing:false,turning:0,downProgress:0,
 deterministic:true,poseDiagnostics:false
});

test('P2.1 cold healthy pose does not construct a second invisible firearm',()=>{
 const rig=createOperatorRig('p21-rook','blue');
 try{
  const p=baseline('carbine',initialWeaponConfiguration('carbine'));
  poseOperator(rig,p,0);
  assert.ok(rig.weaponBody.children.length>0,'held model is ready');
  assert.equal(rig.droppedWeaponBody.children.length,0,
   'no invisible dropped silhouette is generated during normal play');
  assert.equal(rig.droppedAccessories.children.length,0,
   'no invisible duplicate attachments during normal play');
  assert.equal(rig.droppedGun.visible,false);
  // The first frame of collapse is still a held gun.
  poseOperator(rig,{...p,down:true,downProgress:.25,seconds:1},0);
  assert.equal(rig.droppedWeaponBody.children.length,0);
  // On the EXACT first frame where the drop appears, construct the normal
  // real firearm and its attachments; no later frame may be required.
  poseOperator(rig,{...p,down:true,downProgress:1,seconds:2},0);
  assert.equal(rig.droppedGun.visible,true);
  assert.ok(rig.droppedWeaponBody.children.length>0);
  assert.deepEqual(
   rig.droppedWeaponBody.children.map(x=>x.name),
   rig.weaponBody.children.map(x=>x.name),
   'dropped model retains exactly the same authored silhouette parts');
  assert.deepEqual(
   rig.droppedAccessories.children.map(x=>x.name),
   rig.weaponAccessories.children.map(x=>x.name),
   'dropped weapon gets full configured accessories on that first frame');
  const oldBody=rig.droppedWeaponBody.children[0];
  poseOperator(rig,{...p,down:true,downProgress:1,seconds:2.02},0);
  assert.equal(rig.droppedWeaponBody.children[0],oldBody,
   'visible dropped geometry is reused rather than regenerated');
 }finally{rig.dispose();}
});

test('P2.1 a changed firearm invalidates deferred drop and rebuilds correctly',()=>{
 const rig=createOperatorRig('p21-vale','blue');
 try{
  const carbine=baseline('carbine');
  poseOperator(rig,{...carbine,down:true,downProgress:1},0);
  assert.ok(rig.droppedWeaponBody.children.length>0);
  const rifle=baseline('rifle');
  poseOperator(rig,{...rifle,seconds:3},0);
  assert.ok(rig.weaponBody.children.length>0);
  assert.equal(rig.droppedWeaponBody.children.length,0);
  poseOperator(rig,{...rifle,surrender:true,downProgress:1,seconds:4},0);
  assert.equal(rig.droppedGun.visible,true);
  assert.deepEqual(
   rig.droppedWeaponBody.children.map(x=>x.name),
   rig.weaponBody.children.map(x=>x.name));
 }finally{rig.dispose();}
});
