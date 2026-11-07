import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseTorsoAssist,TORSO_ASSIST_YAWS}
 from '../src/breach-pose-v3-body-assist.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const solution=(quality,status='clear')=>({quality,status});
test('V3 torso assist only evaluates neutral pose unless opted into Lab',()=>{
 let count=0;const choose=yaw=>{count++;return solution(yaw===.08?0:2)};
 assert.equal(chooseTorsoAssist(choose,false).yaw,0);
 assert.equal(count,1);
 assert.deepEqual([...TORSO_ASSIST_YAWS],[0,-.08,.08,-.16,.16]);
 assert.equal(chooseTorsoAssist(choose,true).yaw,.08);
});
test('V3 torso assist prioritizes validity, retains neutral on ties',()=>{
 assert.equal(chooseTorsoAssist(yaw=>
  solution(yaw===0?2:0,yaw===0?'clear':'guard-fallback'),true).yaw,0);
 assert.equal(chooseTorsoAssist(()=>solution(1),true).yaw,0);
 assert.equal(chooseTorsoAssist(()=>null,true),null);
});
test('Heavy carrier chooses valid tucked arm over winged neutral fit',()=>{
 const shoulder={y:4,z:7};
 const make=(yaw)=>{
  const wing=yaw===0;
  return {status:'clear',quality:wing?0:2,
   arms:[null,{joint:{y:wing?3.45:-4.0,z:wing?10.6:7.3}}]};
 };
 assert.equal(chooseTorsoAssist(make,true,shoulder).yaw,-.08);
 assert.equal(chooseTorsoAssist(make,false,shoulder).yaw,0,
  'live gameplay never auditions new body yaw');
 assert.equal(chooseTorsoAssist(make,true).yaw,0,
  'unarmored default keeps original neutral selection');
});
test('V3 Lab opt-in keeps valid low-ready contact and reports bounded yaw',()=>{
 const config=selectWeaponFamilyPreset(
  initialWeaponConfiguration('carbine'),'ar-m4a1');
 const pose={x:0,z:0,heading:0,velocity:0,seconds:1,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,aimBlend:0,
  handlingOverride:'low',weaponConfiguration:config,
  poseV3Preview:true,deterministic:true};
 const rig=createOperatorRig('pose-assist','blue',true);
 try{
  poseOperator(rig,pose,0);
  const report=rig.root.userData.lowReadyPoseReport;
  assert.equal(report.status,'clear');
  assert.ok(Math.abs(report.torsoAssistYaw)<=.16001);
  const first=rig.chest.rotation.y;
  poseOperator(rig,{...pose,seconds:2},0);
  assert.ok(Math.abs(first-rig.chest.rotation.y)<1e-7,
   'seek/repeat must not accumulate chest yaw');
 }finally{rig.dispose();}
});
