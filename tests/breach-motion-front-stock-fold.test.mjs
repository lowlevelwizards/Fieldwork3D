import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ANATOMY,stockPocket,carryElbowViolation}
 from '../src/breach-anatomy.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {fitWeaponPose,weaponGrips}
 from '../src/breach-weapon-pose.ts';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const carbine='carbine';
const configuration=selectWeaponFamilyPreset(
  initialWeaponConfiguration(carbine),'ar-m4a1');
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const base={x:0,z:0,heading:0,weaponYaw:0,weapon:carbine,
 weaponConfiguration:configuration,aim:1,velocity:0,recoil:0,
 posture:'stand'};
const pose=(mode,more={})=>({
 x:0,z:0,heading:0,travelYaw:0,velocity:0,seconds:2,
 stride:0,posture:'stand',injury:0,weapon:carbine,
 weaponConfiguration:configuration,reload:0,reloadDuration:1.8,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:mode==='ads',firing:false,turning:0,aimBlend:mode==='ads'?1:0,
 deterministic:true,handlingOverride:mode,...more
});
const armJoint=arm=>arm.lower.position.clone().multiplyScalar(2)
 .sub(arm.hand.position);
const armShoulder=(arm,joint)=>arm.upper.position.clone()
 .multiplyScalar(2).sub(joint);

test('front torso is the buttplate seat in every ready pose',()=>{
 for(const mode of ['low','high','ready','short','point','ads']){
  const pocket=stockPocket(mode);
  assert.ok(pocket.x>=4.3&&pocket.x<=5.2,mode+' front seat X');
  assert.ok(pocket.z>=6.5&&pocket.z<7.0,mode+' close to chest edge');
  const fit=fitWeaponPose({weapon:carbine,configuration,
   handling:mode,yaw:0,recoil:0});
  assert.ok(fit.stockError<3,mode+' contact stays seated');
  assert.ok(fit.stock.z<7.8,mode+' no floating side stock');
 }
});
test('wall fold is a continuous rigid gun transform with sliding grip',()=>{
 const input={weapon:carbine,configuration,handling:'short',
  shortFrom:'ready',yaw:0,recoil:0};
 const from=fitWeaponPose({...input,handling:'ready'});
 let lastZ=Infinity,lastX=Infinity;
 for(const progress of [0,.1,.25,.4,.6,.8,1]){
  const fit=fitWeaponPose({...input,shortCompression:progress});
  assert.ok(fit.stock.x>3.0&&fit.stock.z<7.8,
    'buttplate leaves chest at '+progress);
  const grips=weaponGrips(carbine,configuration,'ready');
  const shortGrips=weaponGrips(carbine,configuration,'short');
  const ease=progress*progress*(3-2*progress);
  const supportX=(grips.supportX*(1-ease)+shortGrips.supportX*ease)*
    shortGrips.lengthScale;
  const supportY=grips.supportY*(1-ease)+shortGrips.supportY*ease;
  const actual=V(supportX,supportY,-1.6)
    .applyEuler(fit.rotation).add(fit.origin);
  assert.ok(actual.distanceTo(fit.support)<1e-6,
    'support wrist detached from gun at '+progress);
  const sample=muzzleAtShot({...base,obstruction:true,
    shortCompression:progress});
  assert.ok(sample.y<=lastZ+.01,'barrel must fold downward');
  assert.ok(sample.x<=lastX+.01,'barrel must come back toward torso');
  lastZ=sample.y;lastX=sample.x;
 }
});
test('approaching a wall produces increasing compression before contact',()=>{
 const ready=muzzleAtShot(base);
 const walls=[ready.x+16,ready.x+7,ready.x+2,ready.x-3];
 let previous=-.001;
 for(const x of walls){
  const result=weaponClearance(base,[],[],[
   {a:{x,y:-40},b:{x,y:40}}
  ]);
  assert.ok(result.compression>=previous,
    'wall approach must not unfold a rifle: '+x);
  assert.ok(result.compression>=0&&result.compression<=1);
  if(result.compression>0){
   assert.equal(result.obstruction,true);
   assert.deepEqual(result.muzzle,muzzleAtShot({...base,
     obstruction:true,shortCompression:result.compression,
     clearanceRetraction:0}));
  }
  previous=result.compression;
 }
 assert.ok(previous>.35,'barrel never responded to approaching wall');
});
test('short-stock and run keep both elbows forward/down without stretching',()=>{
 const rig=createOperatorRig('stock-fold-elbows','blue');
 try{
  const cases=[
   pose('ready'),pose('ads'),pose('short'),
   ...[.1,.3,.55,.8,1].map(shortCompression=>
     pose('short',{shortCompression})),
   pose('low',{velocity:46,gait:'run',handlingIntent:'run',
     deterministic:true})
  ];
  for(const state of cases){
   poseOperator(rig,state,0);
   for(const [index,arm] of rig.arms.entries()){
    const joint=armJoint(arm),shoulder=armShoulder(arm,joint);
    assert.ok(carryElbowViolation(shoulder,joint,index===0?-1:1)<.075,
      'elbow flapped behind shoulder in '+state.handlingOverride+
        ' progress '+(state.shortCompression??'full')+
        ' arm '+index+': '+JSON.stringify(joint.toArray()));
    assert.ok(Math.abs(arm.upper.scale.y-10)<1e-6);
    assert.ok(Math.abs(arm.lower.scale.y-10)<1e-6);
   }
  }
 }finally{rig.dispose();}
});
