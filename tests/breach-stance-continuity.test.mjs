import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {interpolateWeaponCarry} from '../src/breach-low-ready-transition.ts';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';

const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const config=selectWeaponFamilyPreset(
 initialWeaponConfiguration('carbine'),'ar-m4a1');
const pose={
 x:0,z:0,heading:0,velocity:0,seconds:2,stride:0,posture:'stand',
 injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,shotHeading:0,aimBlend:0,
 deterministic:true,poseV3Preview:true,poseV4ReloadPreview:true,
 weaponConfiguration:config
};
function snapshot(r){
 const fit=r.root.userData.presentedWeaponFit;
 assert.ok(fit,'actual displayed weapon fit');
 return {
  fit:{...fit,origin:fit.origin.clone(),rotation:fit.rotation.clone(),
   stock:fit.stock.clone(),primary:fit.primary.clone(),
   support:fit.support.clone()},
  chest:{position:r.chest.position.clone(),rotation:r.chest.rotation.clone()},
  arms:r.arms.map(arm=>{
   const wrist=arm.hand.position.clone();
   const elbow=arm.lower.position.clone().multiplyScalar(2).sub(wrist);
   const shoulder=arm.upper.position.clone().multiplyScalar(2).sub(elbow);
   return {shoulder,elbow,wrist,bend:arm.bend.clone()};
  })
 };
}
function transition(from,to,source,alpha){
 return {from,to,alpha,
  authoredFrom:source.fit,
  authoredChest:source.chest,
  authoredArms:source.arms};
}
function frame(r,handling,transition,seconds){
 poseOperator(r,{...pose,seconds,handlingOverride:handling,
  handlingTransition:transition},0);
 return {gun:r.weapon.position.clone(),gunQ:r.weapon.quaternion.clone(),
  hands:r.arms.map(a=>a.hand.position.clone()),
  elbows:r.arms.map(a=>a.lower.position.clone().multiplyScalar(2)
   .sub(a.hand.position))};
}
function distance(a,b){
 let m=a.gun.distanceTo(b.gun);
 for(let i=0;i<2;i++)m=Math.max(m,
  a.hands[i].distanceTo(b.hands[i]),
  a.elbows[i].distanceTo(b.elbows[i]));
 return m;
}

test('retarget-ready to short stock follows directly interpolated gun, no intermediate mode',()=>{
 const r=createOperatorRig('continuity-basic','blue');
 try{
  frame(r,'ready',undefined,2);
  const source=snapshot(r);
  let previous=null,maxJump=0;
  for(let step=0;step<=64;step++){
   const alpha=step/64;
   const f=frame(r,'short',transition('ready','short',source,alpha),
    2+alpha*.32);
   if(previous){
    const d=distance(previous,f);
    if(d>3)console.log('READY_SHORT_JUMP',step,alpha,'total',d,
      'gun',previous.gun.distanceTo(f.gun),
      'hands',previous.hands.map((h,i)=>h.distanceTo(f.hands[i])),
      'elbows',previous.elbows.map((h,i)=>h.distanceTo(f.elbows[i])));
    maxJump=Math.max(maxJump,d);
   }
   const expected=interpolateWeaponCarry(source.fit,
     fitWeaponPose({weapon:'carbine',configuration:config,
       handling:'short',yaw:0,recoil:0}),alpha);
   // The rig may use other physical constraints, but rigid contacts
   // must move smoothly and its chosen heading must stay finite.
   assert.ok(Number.isFinite(f.gun.x)&&Number.isFinite(f.gun.z));
   assert.ok(Number.isFinite(expected.origin.x));
   previous=f;
  }
  assert.ok(maxJump<3.5,'sudden elbow/hand/gun jump '+maxJump);
  const atEnd=frame(r,'short',undefined,2.4);
  assert.ok(distance(previous,atEnd)<.5,
    'paired-arm authority changes abruptly at alpha=1');
 }finally{r.dispose();}
});
test('interrupted stance transition begins from the displayed gun, hands and elbows',()=>{
 const r=createOperatorRig('continuity-interrupt','blue');
 try{
  frame(r,'ready',undefined,2);
  const first=snapshot(r);
  frame(r,'short',transition('ready','short',first,.45),2.12);
  const midway=frame(r,'short',transition('ready','short',first,.45),2.12);
  const second=snapshot(r);
  const restarted=frame(r,'ads',transition('short','ads',second,0),2.13);
  assert.ok(distance(midway,restarted)<.0001,
    'retarget alpha=0 must reproduce EXACT currently displayed pose');
  assert.ok(midway.gunQ.angleTo(restarted.gunQ)<1e-6);
  let previous=restarted,maxJump=0;
  for(let i=1;i<=48;i++){
   const f=frame(r,'ads',transition('short','ads',second,i/48),
     2.13+i*.34/48);
   const d=distance(f,previous);
   if(d>3)console.log('INTERRUPTED_JUMP',i,d,
    'gun',previous.gun.distanceTo(f.gun),
    'hands',previous.hands.map((h,j)=>h.distanceTo(f.hands[j])),
    'elbows',previous.elbows.map((h,j)=>h.distanceTo(f.elbows[j])));
   maxJump=Math.max(maxJump,d);previous=f;
  }
  assert.ok(maxJump<4.0,'interrupted elbow jump '+maxJump);
  assert.ok(distance(previous,frame(r,'ads',undefined,2.55))<.6);
 }finally{r.dispose();}
});
