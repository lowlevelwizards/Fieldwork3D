import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {liveShortStockPose,fitWeaponPose,weaponGrips}
 from '../src/breach-weapon-pose.ts';
import {M4A1_AUTHORED_SHORT}
 from '../src/breach-authored-m4a1-short-stock.ts';
import {AKM_AUTHORED_SHORT}
 from '../src/breach-authored-short-stock.ts';
import {AUTHORED_SHORT_REFERENCES} from '../src/operator-pose-library.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {legRestRise} from '../src/breach-leg-geometry.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {applyWorkbenchPose} from '../src/operator-pose-workbench.ts';
const near=(a,b,tol=1e-4)=>assert.ok(Math.abs(a-b)<tol,
  a+' != '+b);
const vecNear=(a,b,tol=1e-4)=>{
 const p=Array.isArray(a)?a:a.toArray();
 for(let i=0;i<3;i++)near(p[i],b[i],tol);
};
const configFor=p=>selectWeaponFamilyPreset(
 initialWeaponConfiguration(p.weapon),p.id);
const catalog=[...FAMILY_PRESETS.map(p=>({
 id:p.id,weapon:p.weapon,config:configFor(p)})),
 ...['carbine','rifle','smg','shotgun'].map(weapon=>({
 id:'classic-'+weapon,weapon,config:undefined
 }))];
const sample=(item,t)=>fitWeaponPose({
 weapon:item.weapon,configuration:item.config,
 handling:'short',shortFrom:'ready',shortCompression:t,
 yaw:0,recoil:0
});
const pose=(item,progress,handling='short')=>({
 x:0,z:0,heading:0,travelYaw:0,velocity:0,seconds:3,
 stride:0,posture:'stand',injury:0,weapon:item.weapon,
 weaponConfiguration:item.config,reload:0,reloadDuration:1.8,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,handlingOverride:handling,
 shortCompression:progress,deterministic:true,
 poseV3Preview:true,poseV4ReloadPreview:true
});
const elbow=arm=>arm.lower.position.clone().multiplyScalar(2)
 .sub(arm.hand.position);
const shoulder=arm=>arm.upper.position.clone().multiplyScalar(2)
 .sub(elbow(arm));

test('all modular and legacy firearms have a finite, deterministic tucked pose',()=>{
 assert.ok(catalog.length>=34);
 assert.deepEqual(AKM_AUTHORED_SHORT,
  AUTHORED_SHORT_REFERENCES['ak-akm']);
 assert.deepEqual(M4A1_AUTHORED_SHORT,
  AUTHORED_SHORT_REFERENCES['ar-m4a1']);
 for(const item of catalog){
  const p=liveShortStockPose(item.weapon,item.config);
  const again=liveShortStockPose(item.weapon,item.config);
  assert.equal(p,again,'uncached pose: '+item.id);
  assert.equal(p.weapon,item.weapon,item.id);
  assert.equal(p.targets.stock.length,3,item.id);
  assert.ok(Object.values(p.targets).flat().every(Number.isFinite),
   'bad target '+item.id);
  assert.ok(p.targets.stock[0]<0&&p.targets.stock[2]>5,
   'tuck no longer near waist/right ribs: '+item.id);
  const fit=sample(item,1);
  vecNear(fit.stock,p.targets.stock);
  const grips=weaponGrips(item.weapon,item.config,'ready');
  vecNear(new THREE.Vector3(grips.stockX*grips.lengthScale,0,0)
   .applyEuler(fit.rotation).add(fit.origin),fit.stock.toArray());
 }
});
test('approved M4A1 and AKM full endpoints are absolutely unchanged',()=>{
 for(const [id,ref] of [
  ['ar-m4a1',M4A1_AUTHORED_SHORT],['ak-akm',AKM_AUTHORED_SHORT]]){
  const p=FAMILY_PRESETS.find(f=>f.id===id);
  const live=liveShortStockPose(p.weapon,configFor(p));
  assert.equal(live,ref,'author reference replaced for '+id);
  vecNear(sample({id,weapon:p.weapon,config:configFor(p)},1).stock,
   ref.targets.stock);
 }
});
test('0..1 short stock folds consistently for every firearm',()=>{
 for(const item of catalog){
  let previous=sample(item,0);
  const ready=fitWeaponPose({weapon:item.weapon,configuration:item.config,
   handling:'ready',yaw:0,recoil:0});
  vecNear(previous.stock,ready.stock.toArray());
  for(let i=1;i<=20;i++){
   const next=sample(item,i/20);
   const delta=next.stock.distanceTo(previous.stock);
   assert.ok(delta<3,
    item.id+' stock popped at '+i/20+': '+delta);
   previous=next;
  }
 }
});
test('rendered weapon and shot-time muzzle derive from identical tuck',()=>{
 for(const item of catalog){
  const assembly=item.config?resolveWeaponAssembly(item.config):null;
  const grip=weaponGrips(item.weapon,item.config,'ready');
  for(const t of [0,.5,1]){
   const fit=sample(item,t);
   const muzzle= new THREE.Vector3(
    (assembly?.muzzleX??19.5)*grip.lengthScale,
    assembly?.muzzleY??0,0).applyEuler(fit.rotation).add(fit.origin);
   const shot=muzzleAtShot({
    x:0,z:0,heading:0,weaponYaw:0,weapon:item.weapon,
    weaponConfiguration:item.config,aim:0,velocity:0,recoil:0,
    shortCompression:t,obstruction:true,posture:'stand'
   });
   near(shot.x,muzzle.x,1e-5);
   near(shot.z,muzzle.z,1e-5);
   near(shot.y,26+legRestRise(0,'stand')+muzzle.y,1e-5);
  }
 }
});
test('actual arms use the same one-pass authored IK on every weapon',()=>{
 const rig=createOperatorRig('live-all-weapon-short','blue');
 const manual=createOperatorRig('reference-all-weapon-short','blue');
 try{
  for(const item of catalog){
   poseOperator(rig,pose(item,1),0);
   const report=rig.root.userData.authoredShortStock;
   assert.equal(report?.solver,'single-two-bone',
    'fallback elbow solver used: '+item.id);
   const ref=liveShortStockPose(item.weapon,item.config);
   const reference=applyWorkbenchPose(manual,ref,item.config);
   for(let i=0;i<2;i++){
    const liveArm=rig.arms[i],sampleArm=manual.arms[i];
    vecNear(liveArm.hand.position,sampleArm.hand.position.toArray(),1e-3);
    vecNear(elbow(liveArm),elbow(sampleArm).toArray(),1e-3);
    vecNear(shoulder(liveArm),shoulder(sampleArm).toArray(),1e-3);
    near(liveArm.upper.scale.y,10);
    near(liveArm.lower.scale.y,10);
   }
   assert.ok(Number.isFinite(reference.maxReachError),item.id);
   assert.ok(Number.isFinite(reference.maxContactGap),item.id);
  }
  poseOperator(rig,{...pose(catalog[0],undefined,'low'),
   velocity:46,handlingIntent:'run',gait:'run'},0);
  assert.equal(rig.root.userData.authoredShortStock,null,
   'running accidentally using manual short-stock');
 }finally{rig.dispose();manual.dispose();}
});
