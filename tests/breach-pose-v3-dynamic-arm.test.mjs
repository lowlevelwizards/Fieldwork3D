import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {solveV3DynamicArm,MAX_DYNAMIC_ARM_CANDIDATES}
 from '../src/breach-pose-v3-dynamic-arm.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const empty={armor:'armor-bare',rig:'no-rig',top:'bdu-shirt',
 front:5,boxes:[]};
const input={shoulder:V(1,4,7),wrist:V(11,-4,5),side:1,
 mode:'carry',envelope:empty,preferredPole:V(0,1,8)};
test('V3 dynamic arms choose valid downward elbow without moving the wrist',()=>{
 const a=solveV3DynamicArm(input);
 assert.equal(a.status,'clear');
 assert.ok(a.report.valid);
 assert.ok(a.report.elbowDrop>0);
 assert.ok(a.solution.effector.distanceTo(input.wrist)<.00001);
 assert.equal(a.candidates,MAX_DYNAMIC_ARM_CANDIDATES);
 assert.ok(a.evaluations<=MAX_DYNAMIC_ARM_CANDIDATES*3);
 assert.equal(a.softScale,1,'empty envelope needs no compression');
 const b=solveV3DynamicArm(input);
 assert.ok(a.solution.joint.distanceTo(b.solution.joint)<1e-9,
  'fixed inputs produce identical elbow joints');
});
test('V3 impossible reaches do not become successful fallback poses',()=>{
 const r=solveV3DynamicArm({...input,wrist:V(50,15,5)});
 assert.equal(r.status,'unresolved');
 assert.equal(r.solution,null);
 assert.equal(r.reason,'out-of-reach');
});
test('V3 rejects rigid penetration even if a candidate looks attractive',()=>{
 const blocked={...empty,boxes:[{label:'torso',material:'rigid',
 min:{x:-30,y:-30,z:-30},max:{x:30,y:30,z:30}}]};
 const r=solveV3DynamicArm({...input,envelope:blocked});
 assert.equal(r.status,'unresolved');
 assert.equal(r.solution,null);
 assert.equal(r.reason,'no-clearance');
 assert.ok(r.evaluations<=MAX_DYNAMIC_ARM_CANDIDATES*3);
 assert.ok(r.softScale<=1.65,'rigid collisions cannot bypass hard limits');
});
test('V3 preview evaluates real ADS pose without changing weapon aim',()=>{
 const config=selectWeaponFamilyPreset(
  initialWeaponConfiguration('carbine'),'ar-m4a1');
 const pose={x:0,z:0,heading:0,velocity:0,seconds:2,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:true,firing:false,turning:0,aimBlend:1,
  handlingOverride:'ads',weaponConfiguration:config,deterministic:true};
 const rig=createOperatorRig('v3-dynamic','blue',true);
 try{
  poseOperator(rig,pose,0);
  const origin=rig.weapon.position.clone();
  const rotation=rig.weapon.rotation.clone();
  poseOperator(rig,{...pose,poseV3Preview:true},0);
  assert.ok(rig.weapon.position.distanceTo(origin)<1e-8);
  assert.ok(Math.abs(rig.weapon.rotation.y-rotation.y)<1e-8);
  const diagnostics=rig.root.userData.poseV3DynamicReport;
  assert.equal(diagnostics.length,2);
  assert.ok(diagnostics.every(x=>x.status==='clear'||x.status==='unresolved'));
  assert.ok(diagnostics.every(x=>x.candidates<=MAX_DYNAMIC_ARM_CANDIDATES));
 }finally{rig.dispose();}
});
