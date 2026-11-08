import test from 'node:test';
import assert from 'node:assert/strict';
import {anatomicalElbowCost,ANATOMY,stockPocket}
 from '../src/breach-anatomy.ts';
import {LEG_HIP_HEIGHT,LEG_NEUTRAL_KNEE_FLEXION,LEG_REST_RISE,
 legRestRise,LEG_STANCE_SIDE,LEG_HIP_SIDE}
 from '../src/breach-leg-geometry.ts';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const config=selectWeaponFamilyPreset(
 initialWeaponConfiguration('carbine'),'ar-m4a1');
const pose=(handlingOverride,more={})=>({
 x:0,z:0,heading:0,travelYaw:0,velocity:0,seconds:0,
 stride:0,posture:'stand',injury:0,weapon:'carbine',
 weaponConfiguration:config,reload:0,reloadDuration:1.8,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:handlingOverride==='ads',firing:false,turning:0,
 deterministic:true,handlingOverride,...more
});
test('stage 1: one neutral knee and natural planted-stance geometry',()=>{
 assert.ok(Math.abs((LEG_STANCE_SIDE-LEG_HIP_SIDE)-.8)<1e-6);
 assert.ok(LEG_NEUTRAL_KNEE_FLEXION>.3&&
   LEG_NEUTRAL_KNEE_FLEXION<.7);
 assert.equal(legRestRise(0,'stand'),LEG_REST_RISE);
 assert.equal(ANATOMY.neutralHip,LEG_HIP_HEIGHT+LEG_REST_RISE);
 assert.equal(legRestRise(12,'stand'),0);
 assert.equal(legRestRise(0,'crouch'),0);
 assert.equal(legRestRise(0,'stand',true),0);
 const rig=createOperatorRig('stage1-leg','blue');
 try{
  let neutralShoes;
  for(const handling of ['low','ready','high','short','point','ads']){
   poseOperator(rig,pose(handling),0);
   assert.ok(rig.hip.position.y>LEG_HIP_HEIGHT+2,
     handling+' must share the upright standing anatomy');
   assert.ok(rig.legGap.every(g=>g<.35),
     handling+' cannot stretch an idle leg');
   const shoes=rig.feet.map(f=>f.shoe.position.clone());
   if(neutralShoes)for(let i=0;i<2;i++)
     assert.ok(shoes[i].distanceTo(neutralShoes[i])<1e-5,
       'switching rifle hold must not relocate either planted foot');
   else neutralShoes=shoes;
  }
 }finally{rig.dispose();}
});
test('stage 1: M4 support elbow prefers a natural down/outboard bend',()=>{
 const shoulder=ANATOMY.shoulderLeft;
 const wrist={x:12,y:1,z:-2};
 const natural={x:7,y:-2,z:-9};
 const broken={x:0,y:7,z:0};
 assert.ok(anatomicalElbowCost(shoulder,natural,wrist,-1)<
   anatomicalElbowCost(shoulder,broken,wrist,-1));
 const rig=createOperatorRig('stage1-m4','blue');
 try{
  poseOperator(rig,pose('ready'),0);
  assert.ok(rig.arms.every(arm=>Number.isFinite(arm.upper.scale.y)
    &&Math.abs(arm.upper.scale.y-10)<1e-5
    &&Math.abs(arm.lower.scale.y-10)<1e-5),
    'M4 ready must retain 10 + 10 arm anatomy');
  assert.ok(Number.isFinite(rig.gripError));
 }finally{rig.dispose();}
});
test('stage 1: short-stock firing elbow is preferred outside the receiver',()=>{
 const shoulder=ANATOMY.shoulderRight;
 const wrist={x:5,y:0,z:11};
 const outboard={x:5,y:-3,z:13};
 const trapped={x:5,y:-3,z:7};
 assert.ok(anatomicalElbowCost(shoulder,outboard,wrist,1,true)<
   anatomicalElbowCost(shoulder,trapped,wrist,1,true));
 assert.ok(Math.abs(stockPocket('short').z-stockPocket('ads').z)<.5);
});
test('stage 1: ADS keeps stock external to shoulder with bounded eye fit',()=>{
 const rig=createOperatorRig('stage1-ads','blue');
 try{
  poseOperator(rig,pose('ads'),0);
  assert.ok(stockPocket('ads').x>ANATOMY.shoulderRight.x+2);
  assert.ok(stockPocket('ads').z<ANATOMY.shoulderRight.z);
  assert.ok(Number.isFinite(rig.eyeError));
  assert.ok(rig.head.position.y>5,'sight alignment must not crush the neck');
 }finally{rig.dispose();}
});
