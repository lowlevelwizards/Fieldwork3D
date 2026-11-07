/** Exact coordinated memoization: no rounded yaw bins or stale gear poses. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const weaponConfiguration=selectWeaponFamilyPreset(
 initialWeaponConfiguration('carbine'),'ar-m4a1');
const pose={
 x:0,z:0,heading:0,travelYaw:0,pelvisYaw:0,
 seconds:4,idleLifeSeconds:4,stride:0,velocity:0,turning:0,
 posture:'stand',injury:0,weapon:'carbine',
 reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
 down:false,surrender:false,aiming:false,firing:false,aimBlend:0,
 shotHeading:0,deterministic:true,
 handlingOverride:'ready',poseV3Preview:true,poseV4ReloadPreview:true,
 weaponConfiguration
};
test('UOP exact coordinated cache reuses only identical pose inputs',()=>{
 const rig=createOperatorRig('uop-coordinated-memo','blue',true);
 try{
  poseOperator(rig,pose,0);
  const first=rig.root.userData.poseV3CoordinatedReport;
  assert.ok(first,'expected V3 paired-arm fitting to run');
  assert.equal(first.cached,false);
  poseOperator(rig,pose,0);
  assert.equal(rig.root.userData.poseV3CoordinatedReport?.cached,true,
    'identical intent and geometry must reuse the fit');
  poseOperator(rig,{...pose,shotHeading:.18},0);
  assert.equal(rig.root.userData.poseV3CoordinatedReport?.cached,false,
    'changed authoritative weapon heading must invalidate the fit');
  poseOperator(rig,{...pose,shotHeading:.18},0);
  assert.equal(rig.root.userData.poseV3CoordinatedReport?.cached,true);
  poseOperator(rig,{...pose,reload:.9},0);
  assert.equal(rig.root.userData.poseV3CoordinatedReport?.cached,false,
    'released action wrist must invalidate previous paired-arm fit');
 }finally{rig.dispose();}
});
