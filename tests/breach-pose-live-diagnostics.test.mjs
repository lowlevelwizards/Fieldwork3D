import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const config=selectWeaponFamilyPreset(
 initialWeaponConfiguration('carbine'),'ar-m4a1');
const pose={
 x:0,z:0,heading:0,velocity:0,seconds:2,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 handlingOverride:'low',aimBlend:0,
 poseV3Preview:true,poseV4ReloadPreview:true,
 weaponConfiguration:config
};
const snapshot=r=>{
 r.root.updateMatrixWorld(true);
 const point=o=>o.getWorldPosition(new THREE.Vector3());
 const q=o=>o.getWorldQuaternion(new THREE.Quaternion());
 return {chest:point(r.chest),gun:point(r.weapon),gunRotation:q(r.weapon),
   arms:r.arms.map(a=>({hand:point(a.hand),upper:point(a.upper),
     lower:point(a.lower)}))};
};
const equivalent=(a,b)=>{
 assert.ok(a.chest.distanceTo(b.chest)<1e-7);
 assert.ok(a.gun.distanceTo(b.gun)<1e-7);
 assert.ok(a.gunRotation.angleTo(b.gunRotation)<1e-7);
 for(let i=0;i<2;i++)
  for(const key of ['hand','upper','lower'])
   assert.ok(a.arms[i][key].distanceTo(b.arms[i][key])<1e-7,
    i+'/'+key);
};
test('UOP live diagnostics opt-out preserves rendered weapon and arm geometry',()=>{
 const lab=createOperatorRig('quiet-fixture','blue',true),
   live=createOperatorRig('quiet-fixture','blue',true);
 try{
  for(const action of [
    {...pose}, {...pose,seconds:3,handlingOverride:'ads',
      aiming:true,aimBlend:1}
  ]){
   poseOperator(lab,action,0);
   poseOperator(live,{...action,poseDiagnostics:false},0);
   equivalent(snapshot(lab),snapshot(live));
   assert.equal(live.root.userData.presentedWeaponFit,null);
   assert.equal(live.root.userData.poseV3DynamicReport,null);
   assert.equal(live.root.userData.poseV3CoordinatedReport,null);
   assert.equal(live.root.userData.poseV3SupportGrip,null);
   assert.equal(live.root.userData.lowReadyPoseReport,null);
   assert.ok(lab.root.userData.presentedWeaponFit);
  }
  assert.ok(lab.root.userData.poseV3CoordinatedReport,
   'Operator Lab still reports coupled/ADS fitting diagnostics');
 }finally{lab.dispose();live.dispose();}
});
