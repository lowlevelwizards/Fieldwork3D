import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {weaponGrips,fitWeaponPose}
 from '../src/breach-weapon-pose.ts';
import {stockPocket} from '../src/breach-anatomy.ts';
import {lowReadyFamilyFit,lowReadyPocket,lowReadyElbowPole}
 from '../src/breach-low-ready-family-fit.ts';
import {armorArmIntrusion} from '../src/breach-arm-armor-clearance.ts';
import {solveTwoBone,ARM_LIMITS} from '../src/breach-ik.ts';

function config(preset){
 return selectWeaponFamilyPreset(
  initialWeaponConfiguration(preset.weapon),preset.id);
}
test('all modular AR/AK families tuck their stock and keep relaxed hand on rear handguard',()=>{
 for(const preset of FAMILY_PRESETS){
  const c=config(preset),profile=lowReadyFamilyFit(c);
  assert.ok(profile,preset.id);
  const base=weaponGrips(preset.weapon,c);
  const relaxed=weaponGrips(preset.weapon,c,'low',1);
  assert.ok(relaxed.supportX<base.supportX,preset.id);
  assert.ok(relaxed.supportY<base.supportY,preset.id);
  assert.ok(relaxed.supportX>=profile.minSupportX,preset.id);
  assert.equal(relaxed.primaryX,base.primaryX,preset.id);
  assert.equal(relaxed.stockX,base.stockX,preset.id);
  assert.deepEqual(weaponGrips(preset.weapon,c,'ads',1),base,preset.id);
  const oldPocket=stockPocket('low');
  const pocket=lowReadyPocket(oldPocket,profile,1);
  assert.ok(pocket.x<oldPocket.x,preset.id);
  assert.ok(pocket.z<oldPocket.z,preset.id);
  assert.ok(pocket.z>=6.35,preset.id);
 }
});

test('AK is carried closer to the magazine well with more elbow bend than AR',()=>{
 const ar=FAMILY_PRESETS.find(p=>p.id==='ar-m4a1');
 const ak=FAMILY_PRESETS.find(p=>p.id==='ak-ak105');
 const ac=config(ar),kc=config(ak);
 const af=lowReadyFamilyFit(ac),kf=lowReadyFamilyFit(kc);
 assert.ok(kf.supportBack>af.supportBack);
 assert.ok(kf.supportDown>af.supportDown);
 assert.ok(kf.carryYaw>af.carryYaw);
 assert.ok(Math.abs(kf.torsoTurn)>Math.abs(af.torsoTurn));
 assert.ok(weaponGrips(ak.weapon,kc,'low',1).supportX<
  weaponGrips(ak.weapon,kc).supportX);
 const shoulder={x:1,y:4,z:-7};
 const elbow=lowReadyElbowPole(shoulder,kf,0);
 assert.ok(elbow.z<0);
 assert.ok(elbow.y<0);
 assert.ok(Number.isFinite(elbow.x));
});

test('low-ready contact fits have stable stock pocket and unmodified aimed ballistics',()=>{
 for(const preset of FAMILY_PRESETS){
  const c=config(preset);
  const standard=fitWeaponPose({weapon:preset.weapon,configuration:c,
   handling:'low',yaw:0,recoil:0,aimBlend:0});
  const relaxed=fitWeaponPose({weapon:preset.weapon,configuration:c,
   handling:'low',yaw:0,recoil:0,aimBlend:0,relaxedLowReady:1});
  assert.ok(Number.isFinite(relaxed.contactError),preset.id);
  assert.ok(relaxed.stockError<1.5,preset.id);
  const targetPocket=lowReadyPocket(stockPocket('low'),lowReadyFamilyFit(c),1);
  assert.ok(relaxed.stock.distanceTo(
   new THREE.Vector3(targetPocket.x,targetPocket.y,targetPocket.z))<1.5,preset.id);
  // Even compact stocks may slide to preserve both wrists; they must
  // remain on the external shoulder side, never buried in the carrier.
  assert.ok(relaxed.stock.z>=6.35,preset.id);
  assert.ok(relaxed.twoHanded||relaxed.contactError<2,preset.id);
  assert.ok(Number.isFinite(standard.stock.x),preset.id);
  const target={weapon:preset.weapon,configuration:c,
   handling:'ads',yaw:.15,recoil:0,aimBlend:1};
  const aimed=fitWeaponPose(target);
  const ignored=fitWeaponPose({...target,relaxedLowReady:1});
  assert.ok(aimed.stock.distanceTo(ignored.stock)<1e-6,preset.id);
  assert.ok(aimed.primary.distanceTo(ignored.primary)<1e-6,preset.id);
  assert.ok(aimed.support.distanceTo(ignored.support)<1e-6,preset.id);
  assert.ok(aimed.origin.distanceTo(ignored.origin)<1e-6,preset.id);
 }
});

test('elbow candidates remain two-bone reach-limited and armor scoring penalizes piercing',()=>{
 const shoulder=new THREE.Vector3(1,4,-7),wrist=new THREE.Vector3(17,-5,-1);
 const ak=lowReadyFamilyFit(config(FAMILY_PRESETS.find(p=>p.id==='ak-akm')));
 const options=[0,1].map(i=>{
  const pole=lowReadyElbowPole(shoulder,ak,i);
  return solveTwoBone(shoulder,wrist,10,10,
   new THREE.Vector3(pole.x,pole.y,pole.z),ARM_LIMITS);
 });
 for(const result of options){
  assert.ok(Number.isFinite(result.joint.x));
  assert.ok(Math.abs(result.joint.distanceTo(shoulder)-10)<.01);
  assert.ok(result.effector.distanceTo(shoulder)<=20+.001);
 }
 const piercing=armorArmIntrusion(shoulder,
  new THREE.Vector3(5,-2,-1),wrist,9.8);
 const clear=armorArmIntrusion(shoulder,
  new THREE.Vector3(9,-2,-11),
  new THREE.Vector3(16,-5,-11),9.8);
 assert.ok(piercing>clear);
});
