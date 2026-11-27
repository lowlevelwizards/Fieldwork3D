import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {retentionGaitPhase,RETENTION_STRIDE_DISTANCE} from '../src/operator-retention-cadence.ts';
import {sampleSuspensionMotion} from '../src/breach-weapon-suspension.ts';
import {sampleRetentionFreeWrist} from '../src/operator-retention-locomotion.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
test('SR22 accumulated motor distance samples a slow continuous visual cycle',()=>{
 assert.equal(RETENTION_STRIDE_DISTANCE,38);
 assert.ok(Math.abs(retentionGaitPhase(9.5)-Math.PI/2)<1e-9);
 assert.equal(retentionGaitPhase(38),0);
 assert.equal(retentionGaitPhase(NaN),0);
 for(const speed of [16,40,53,75]){
  let prev,wr,signChanges=0,lastSign=0;
  for(let i=0;i<=120;i++){
   const m={stride:speed*i/60,speed,massKg:3,inertia:100,gait:speed>60?'run':'walk'};
   const a=sampleSuspensionMotion('two',m),b=sampleRetentionFreeWrist(1,'front-slung',m);
   if(prev){
    assert.ok(Math.abs(a.lift-prev.lift)<.28,'vertical bounce rate');
    assert.ok(Math.abs(a.pitch-prev.pitch)<.045,'pitch rate');
    assert.ok(b.distanceTo(wr)<.8,'free hand rate');
   }
   const sign=Math.sign(b.x-.30);
   if(lastSign&&sign&&sign!==lastSign)signChanges++;
   if(sign)lastSign=sign;
   prev=a;wr=b;
  }
  assert.ok(signChanges<=Math.ceil(speed*2/38*2)+1,'no high-frequency swing');
 }
});
test('SR22 live-style moving full front/back retention rigs are bounded across consecutive frames',()=>{
 const cfg=setWeaponAttachment(initialWeaponConfiguration('carbine'),'sling','sling-two-point');
 for(const mode of ['front-slung','back-slung']){
  const rig=createOperatorRig('cadence-'+mode,'blue');
  try{
   let previous;
   for(let i=0;i<72;i++){
    const seconds=i/60,distance=seconds*53;
    poseOperator(rig,{x:distance,z:0,heading:0,velocity:53,seconds,stride:distance,
      posture:'stand',gait:'walk',injury:0,weapon:'carbine',reload:0,reloadDuration:1,
      lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,aiming:false,firing:false,
      turning:0,weaponConfiguration:cfg,deterministic:true,
      retentionTransition:{mode,desired:mode,weight:1}},1/60);
    const a={pos:rig.weapon.position.clone(),q:rig.weapon.quaternion.clone(),
      hand:rig.arms[1].hand.position.clone()};
    assert.ok(rig.weapon.visible);
    if(previous&&i>2){
     assert.ok(a.pos.distanceTo(previous.pos)<1.6,mode+' weapon translation '+i);
     assert.ok(a.q.angleTo(previous.q)<.12,mode+' weapon rotation '+i);
     assert.ok(a.hand.distanceTo(previous.hand)<1.4,mode+' right hand '+i);
    }
    previous=a;
   }
  }finally{rig.dispose();}
 }
});
