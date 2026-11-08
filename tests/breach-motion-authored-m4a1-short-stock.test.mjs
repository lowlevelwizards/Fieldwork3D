import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M4A1_AUTHORED_SHORT,isAuthoredM4A1,authoredShortPhase}
 from '../src/breach-authored-m4a1-short-stock.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {fitWeaponPose,weaponGrips}
 from '../src/breach-weapon-pose.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {legRestRise} from '../src/breach-leg-geometry.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {applyWorkbenchPose,readWorkbenchPose}
 from '../src/operator-pose-workbench.ts';
import {solveTwoBone,ARM_LIMITS}
 from '../src/breach-ik.ts';
const config=selectWeaponFamilyPreset(
 initialWeaponConfiguration('carbine'),'ar-m4a1');
const close=(a,b,epsilon=1e-4)=>assert.ok(Math.abs(a-b)<=epsilon,
  a+' did not match '+b);
const sameVec=(v,coords,eps=1e-3)=>{
 for(let i=0;i<3;i++)close(v.toArray()[i],coords[i],eps);
};
const sample=(progress)=>fitWeaponPose({
 weapon:'carbine',configuration:config,handling:'short',
 shortFrom:'ready',shortCompression:progress,yaw:0,recoil:0
});
const rigPose=(mode,progress)=>({
 x:0,z:0,heading:0,travelYaw:0,velocity:0,
 seconds:3,stride:0,posture:'stand',injury:0,weapon:'carbine',
 weaponConfiguration:config,reload:0,reloadDuration:1.8,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,handlingOverride:mode,
 shortCompression:progress,deterministic:true,
 poseV3Preview:true,poseV4ReloadPreview:true
});
const elbowFor=arm=>arm.lower.position.clone()
 .multiplyScalar(2).sub(arm.hand.position);
const shoulderFor=arm=>arm.upper.position.clone()
 .multiplyScalar(2).sub(elbowFor(arm));

test('exact M4A1 pose recipe is the unmodified user-authored XYZ endpoint',()=>{
 const p=M4A1_AUTHORED_SHORT;
 assert.equal(p.version,1);assert.equal(p.preset,'ar-m4a1');
 assert.deepEqual(p.targets.stock,[-9.2,-3.1,9.5]);
 assert.deepEqual(p.targets.supportShoulder,[4.1,4.8,-5.8]);
 assert.deepEqual(p.targets.firingShoulder,[3.6,3.94,5.3]);
 assert.deepEqual(p.targets.supportHand,
  [9.65443922690596,-8.220156243484727,4.960267438360026]);
 assert.deepEqual(p.targets.firingHand,
  [-1.5429852109064708,-8.962764956152528,9.93532957459017]);
 assert.deepEqual(p.targets.supportElbow,[9.5,-3.1,-0.6]);
 assert.deepEqual(p.targets.firingElbow,
  [-3.8,-4.050550665342721,12.08454391675615]);
 assert.deepEqual(p.weaponRotation,[3,8,-13]);
 assert.deepEqual(p.torso,[0,0.8021409131831525,-0.7091446901966934]);
 assert.deepEqual(readWorkbenchPose(JSON.stringify(p)),p);
 assert.equal(isAuthoredM4A1('carbine',config),true);
 assert.equal(isAuthoredM4A1('rifle',config),false);
 const mk18=selectWeaponFamilyPreset(
  initialWeaponConfiguration('carbine'),'ar-mk18');
 assert.equal(isAuthoredM4A1('carbine',mk18),false);
 assert.equal(isAuthoredM4A1('carbine',undefined),false);
});
test('exact stock+orientation matches the physical workbench gun transform',()=>{
 const p=M4A1_AUTHORED_SHORT,fit=sample(1);
 sameVec(fit.stock,p.targets.stock,1e-6);
 close(THREE.MathUtils.radToDeg(fit.rotation.x),3);
 close(THREE.MathUtils.radToDeg(fit.rotation.y),8);
 close(THREE.MathUtils.radToDeg(fit.rotation.z),-13);
 const grips=weaponGrips('carbine',config,'ready');
 const stockLocal=new THREE.Vector3(grips.stockX*grips.lengthScale,0,0)
  .applyEuler(fit.rotation).add(fit.origin);
 sameVec(stockLocal,p.targets.stock,1e-6);
 assert.ok(fit.stock.x<0&&fit.stock.z>7.5,
  'rear cap must tuck behind shoulder beside right ribs');
});
test('0..1 compressed fit follows one continuous rigid firearm, never steps',()=>{
 const ready=fitWeaponPose({weapon:'carbine',configuration:config,
  handling:'ready',yaw:0,recoil:0});
 const zero=sample(0);
 sameVec(zero.stock,ready.stock.toArray());
 sameVec(zero.origin,ready.origin.toArray());
 const last=sample(1);
 assert.ok(last.stock.x<ready.stock.x-5);
 assert.ok(last.stock.z>ready.stock.z+2);
 let prev=zero;
 for(let i=1;i<=20;i++){
  const fit=sample(i/20);
  const delta=fit.stock.distanceTo(prev.stock);
  assert.ok(delta<2.5,'short-stock teleported at frame '+i+': '+delta);
  assert.ok(fit.stock.x<=prev.stock.x+.3,
   'tuck should never jump forward during wall approach');
  const grip=weaponGrips('carbine',config,'ready');
  sameVec(new THREE.Vector3(grip.stockX*grip.lengthScale,0,0)
    .applyEuler(fit.rotation).add(fit.origin),fit.stock.toArray(),1e-6);
  prev=fit;
 }
 close(authoredShortPhase(.5),.5);
});
test('shot muzzle samples the identical rigid M4A1 fit through compression',()=>{
 const resolved=resolveWeaponAssembly(config);
 for(const t of [0,.25,.5,.75,1]){
  const fit=sample(t);
  const tip=new THREE.Vector3(resolved.muzzleX*
    weaponGrips('carbine',config,'ready').lengthScale,
    resolved.muzzleY,0).applyEuler(fit.rotation).add(fit.origin);
  const shot=muzzleAtShot({
   x:0,z:0,heading:0,weaponYaw:0,weapon:'carbine',
   weaponConfiguration:config,aim:0,velocity:0,recoil:0,
   shortCompression:t,obstruction:true,posture:'stand'
  });
  close(shot.x,tip.x,1e-6);
  close(shot.z,tip.z,1e-6);
  close(shot.y,26+legRestRise(0,'stand')+tip.y,1e-6);
 }
});
test('full static rig hands/elbows equal the same manual workbench IK',()=>{
 const rig=createOperatorRig('author-live','blue'),
  reference=createOperatorRig('author-reference','blue');
 try{
  poseOperator(rig,rigPose('short',1),0);
  poseOperator(reference,rigPose('ready',undefined),0);
  const report=applyWorkbenchPose(reference,M4A1_AUTHORED_SHORT,config);
  for(let i=0;i<2;i++){
   const actual=rig.arms[i],expected=reference.arms[i];
   sameVec(actual.hand.position,expected.hand.position.toArray(),1e-4);
   sameVec(elbowFor(actual),elbowFor(expected).toArray(),1e-4);
   sameVec(shoulderFor(actual),shoulderFor(expected).toArray(),1e-4);
   close(actual.upper.scale.y,10,1e-4);
   close(actual.lower.scale.y,10,1e-4);
   const authored=i===0?'support':'firing';
   const s=new THREE.Vector3(
     ...M4A1_AUTHORED_SHORT.targets[authored+'Shoulder']);
   const h=new THREE.Vector3(
     ...M4A1_AUTHORED_SHORT.targets[authored+'Hand']);
   const e=new THREE.Vector3(
     ...M4A1_AUTHORED_SHORT.targets[authored+'Elbow']);
   const manual=solveTwoBone(s,h,10,10,e.sub(s),ARM_LIMITS);
   sameVec(elbowFor(actual),manual.joint.toArray(),1e-4);
  }
  assert.equal(rig.root.userData.authoredM4ShortStock?.solver,
   'single-two-bone');
  assert.ok(Number.isFinite(report.maxReachError));
 }finally{rig.dispose();reference.dispose();}
});
test('M4A1 manual constraints do not affect running or other weapon families',()=>{
 const rig=createOperatorRig('author-run','blue');
 try{
  poseOperator(rig,{...rigPose('low',undefined),
   velocity:49,gait:'run',handlingIntent:'run'},0);
  assert.equal(rig.root.userData.authoredM4ShortStock,null);
  const mk18=selectWeaponFamilyPreset(
   initialWeaponConfiguration('carbine'),'ar-mk18');
  poseOperator(rig,{...rigPose('short',1),
   weaponConfiguration:mk18},0);
  assert.equal(rig.root.userData.authoredM4ShortStock,null);
  const fit=fitWeaponPose({
   weapon:'carbine',configuration:mk18,handling:'short',
   yaw:0,recoil:0,shortCompression:1
  });
  assert.notDeepEqual(fit.stock.toArray(),
   M4A1_AUTHORED_SHORT.targets.stock);
 }finally{rig.dispose();}
});
