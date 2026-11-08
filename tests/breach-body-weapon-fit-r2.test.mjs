import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {stockPocket,ANATOMY,elbowCorridor} from '../src/breach-anatomy.ts';
import {LEG_UPPER_LENGTH,LEG_LOWER_LENGTH}
 from '../src/breach-leg-geometry.ts';
import {fitWeaponPose,weaponGrips} from '../src/breach-weapon-pose.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const config=id=>{
 const weapon=id.startsWith('ak-')?'rifle':'carbine';
 return {weapon,configuration:selectWeaponFamilyPreset(
  initialWeaponConfiguration(weapon),id)};
};
const pose=(seconds,more={})=>({
 x:0,z:0,heading:0,travelYaw:0,velocity:0,stride:0,
 seconds,posture:'stand',injury:0,weapon:'carbine',
 weaponConfiguration:config('ar-m4a1').configuration,
 reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
 down:false,surrender:false,aiming:false,firing:false,turning:0,
 shotHeading:0,aimBlend:0,deterministic:true,poseV3Preview:true,
 poseV4ReloadPreview:true,...more
});
const joint=arm=>arm.lower.position.clone().multiplyScalar(2)
 .sub(arm.hand.position);
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
function shown(r){
 const f=r.root.userData.presentedWeaponFit;
 return {fit:{...f,origin:f.origin.clone(),rotation:f.rotation.clone(),
  stock:f.stock.clone(),primary:f.primary.clone(),support:f.support.clone()},
  hip:{position:r.hip.position.clone(),rotation:r.hip.rotation.clone()},
  chest:{position:r.chest.position.clone(),rotation:r.chest.rotation.clone()},
  arms:r.arms.map(a=>({shoulder:a.upper.position.clone().multiplyScalar(2)
   .sub(joint(a)),elbow:joint(a),wrist:a.hand.position.clone(),
   bend:a.bend.clone()}))};
}
test('active aim stock stays below a natural firing-side shoulder seat',()=>{
 const ready=stockPocket('ready'),ads=stockPocket('ads');
 assert.ok(ready.x>=3&&ready.z>=7.8);
 assert.ok(ads.y<=6.2,'ADS stock too high on neck');
 assert.ok(ads.y<8&&ads.z>ANATOMY.shoulderRight.z);
 assert.ok(ads.x>ready.x,'ADS stock must remain in front of armor');
});
test('AR/AK fallback and authored contact positions start ahead of magwell',()=>{
 for(const id of ['ar-m4a1','ar-mk18','ak-akm','ak-ak105']){
  const {weapon,configuration}=config(id);
  const region=riflePoseContacts(weapon,configuration);
  const grips=weaponGrips(weapon,configuration,'ready');
  assert.ok(region?.support.near.x>3.0,id);
  assert.ok(grips.supportX>=region.support.near.x,id);
  const fit=fitWeaponPose({weapon,configuration,
    handling:'ready',yaw:0,recoil:0});
  assert.ok(fit.support.toArray().every(Number.isFinite));
  const p=V(grips.supportX*grips.lengthScale,
    grips.supportY,-1.6).applyEuler(fit.rotation).add(fit.origin);
  assert.ok(fit.support.distanceTo(p)<1e-5,id);
 }
});
test('short-stock keeps outward firing elbow corridor without arm stretching',()=>{
 const pole=elbowCorridor('short',1);
 assert.ok(pole.z>12,'right elbow should be beyond weapon');
 const r=createOperatorRig('short-right','blue');
 try{
  poseOperator(r,pose(2,{handlingOverride:'short'}),0);
  assert.ok(r.arms.every(a=>Math.abs(a.upper.scale.y-10)<1e-5&&
    Math.abs(a.lower.scale.y-10)<1e-5));
  const right=joint(r.arms[1]);
  assert.ok(right.z>r.weapon.position.z-.7,
    'firing elbow is trapped inside receiver side');
 }finally{r.dispose();}
});
test('hip and legs retarget with upper body while planted feet remain planted',()=>{
 const r=createOperatorRig('hip-continuity','blue');
 try{
  poseOperator(r,pose(2,{handlingOverride:'low'}),0);
  const src=shown(r);
  const planted=r.feet.map(f=>f.shoe.position.clone());
  let prior=null;
  for(let i=0;i<=48;i++){
   const alpha=i/48;
   poseOperator(r,pose(2+alpha*.24,{
    handlingOverride:'ads',
    handlingTransition:{from:'low',to:'ads',alpha,
      authoredFrom:src.fit,authoredChest:src.chest,
      authoredHip:src.hip,authoredArms:src.arms}
   }),0);
   const lower=r.feet.map(f=>f.lower.position.clone());
   const hip=r.hip.position.clone();
   if(i===0)assert.ok(hip.distanceTo(src.hip.position)<1e-5,
     'first switched frame must show exact previous hip');
   if(prior){
    assert.ok(hip.distanceTo(prior.hip)<.8,
      'hip teleports while upper body is blending');
    for(let side=0;side<2;side++)
     assert.ok(lower[side].distanceTo(prior.lower[side])<1.25,
       'leg joint snaps during stance blend');
   }
   for(let side=0;side<2;side++){
    assert.ok(r.feet[side].shoe.position.distanceTo(planted[side])<1e-4,
      'stance transition moved a planted boot');
    assert.ok(Math.abs(r.feet[side].upper.scale.y-LEG_UPPER_LENGTH)<1e-5);
    assert.ok(Math.abs(r.feet[side].lower.scale.y-LEG_LOWER_LENGTH)<1e-5);
   }
   prior={hip,lower};
  }
 }finally{r.dispose();}
});
test('support elbow does not switch candidate branches while strafing',()=>{
 const r=createOperatorRig('strafe-stability','blue');
 try{
  let last=null,maxJump=0;
  for(let i=0;i<=80;i++){
   const seconds=1+i/60,velocity=30;
   poseOperator(r,pose(seconds,{
    deterministic:false,velocity,travelYaw:Math.PI/2,
    z:(seconds-1)*velocity,aimBlend:.6,aiming:true,
    shotHeading:0,turning:0
   }),1/60);
   const elbow=joint(r.arms[0]);
   if(last)maxJump=Math.max(maxJump,elbow.distanceTo(last));
   last=elbow;
   assert.ok(elbow.toArray().every(Number.isFinite));
  }
  assert.ok(maxJump<4,'support elbow changed branch while strafing: '+maxJump);
 }finally{r.dispose();}
});
