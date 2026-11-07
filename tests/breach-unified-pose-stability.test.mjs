/** UOP Stage A: live (non-deterministic flag) spawn stability.
 * Deliberately pose the SAME timestamp repeatedly, so the test catches
 * procedural chest/head offsets entering next-frame turn smoothing.
 * This reproduces the tactical renderer's V3/V4 flags, not just the Lab.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
  from '../src/equipment-weapon-assemblies.ts';

const heading=.83;
const basePose={
  x:0,z:0,heading,travelYaw:heading,pelvisYaw:-heading,
  velocity:0,turning:0,seconds:3.5,idleLifeSeconds:1.25,stride:0,
  posture:'stand',injury:0,weapon:'carbine',
  reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
  down:false,surrender:false,aiming:false,firing:false,
  aimBlend:0,shotHeading:heading,deterministic:false
};
const angle=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const snapshot=r=>{
  r.root.updateMatrixWorld(true);
  const point=o=>o.getWorldPosition(new THREE.Vector3());
  const rotation=o=>o.getWorldQuaternion(new THREE.Quaternion());
  return {
    chestYaw:r.chest.rotation.y,headYaw:r.head.rotation.y,
    chest:point(r.chest),gun:point(r.weapon),gunRotation:rotation(r.weapon),
    hands:r.arms.map(a=>point(a.hand)),
    elbows:r.arms.map(a=>point(a.lower))
  };
};
const equivalent=(a,b,label)=>{
  assert.ok(angle(a.chestYaw,b.chestYaw)<1e-6,label+'/chest yaw');
  assert.ok(angle(a.headYaw,b.headYaw)<1e-6,label+'/head yaw');
  assert.ok(a.chest.distanceTo(b.chest)<1e-5,label+'/chest');
  assert.ok(a.gun.distanceTo(b.gun)<1e-5,label+'/gun');
  assert.ok(a.gunRotation.angleTo(b.gunRotation)<1e-5,label+'/gun rotation');
  for(let i=0;i<2;i++){
    assert.ok(a.hands[i].distanceTo(b.hands[i])<1e-5,label+'/hand'+i);
    assert.ok(a.elbows[i].distanceTo(b.elbows[i])<1e-5,label+'/elbow'+i);
  }
};

test('UOP A: stationary live poses do not accumulate head or chest corrections',()=>{
  const fixtures=[
    {id:'generic',pose:{}},
    {id:'modular-ar-live-v3-v4',pose:{
      poseV3Preview:true,poseV4ReloadPreview:true,
      weaponConfiguration:selectWeaponFamilyPreset(
        initialWeaponConfiguration('carbine'),'ar-m4a1')
    }}
  ];
  for(const {id,pose} of fixtures){
    const rig=createOperatorRig('uop-'+id,'blue',true);
    try{
      const input={...basePose,...pose};
      poseOperator(rig,input,1/60);
      const initial=snapshot(rig);
      // Repeated render evaluations of a frozen gameplay state are
      // commonplace during pause; they must never reapply torso assist.
      for(let i=0;i<(id==='generic'?24:8);i++){
        poseOperator(rig,input,1/60);
        equivalent(snapshot(rig),initial,id+'/repeat '+i);
      }
    }finally{rig.dispose();}
  }
});

test('UOP A: idle head glances are absolute presentation, not feedback history',()=>{
  const rig=createOperatorRig('uop-head','blue',true);
  try{
    const input={...basePose};
    poseOperator(rig,input,1/60);
    const original=snapshot(rig);
    const later={...input,idleLifeSeconds:7.75};
    poseOperator(rig,later,1/60);
    const atLater=snapshot(rig);
    assert.ok(angle(atLater.chestYaw,original.chestYaw)<1e-6);
    // Return to the original presentation time: it must reproduce
    // the original pose regardless of the intermediate glance.
    poseOperator(rig,input,1/60);
    equivalent(snapshot(rig),original,'idle-clock-return');
  }finally{rig.dispose();}
});
