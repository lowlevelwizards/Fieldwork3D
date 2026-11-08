import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {stockPocket,ANATOMY} from '../src/breach-anatomy.ts';
import {fitWeaponPose,weaponGrips} from '../src/breach-weapon-pose.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
test('short-stock releases shoulder to tuck beneath right armpit',()=>{
 const ready=stockPocket('ready'),short=stockPocket('short');
 assert.ok(short.x<0&&short.x<ready.x-5,'butt moves BACK');
 assert.ok(short.z>ANATOMY.shoulderRight.z+.5&&short.z>ready.z+2,
   'butt moves OUT along right ribs');
 assert.ok(short.y<-4&&short.y<ready.y-7,'butt moves DOWN to waist');
});
test('short-stock rotates one rigid gun with both real hand sockets',()=>{
 for(const id of ['carbine','smg','rifle','shotgun']){
  const ready=fitWeaponPose({weapon:id,handling:'ready',yaw:0,recoil:0});
  const short=fitWeaponPose({weapon:id,handling:'short',yaw:0,recoil:0});
  assert.ok(short.stock.z>ready.stock.z+2,id);
  assert.ok(short.stock.x<ready.stock.x-5,id);
  assert.ok(short.stock.y<ready.stock.y-7,id);
  assert.ok(short.rotation.z<ready.rotation.z-.1&&
    short.rotation.z>-.40,id+' must not point at floor');
  const data=weaponGrips(id,undefined,'short');
  const point=(x,y,z)=>V(x*data.lengthScale,y,z)
    .applyEuler(short.rotation).add(short.origin);
  assert.ok(short.stock.distanceTo(point(data.stockX,0,0))<1e-6);
  assert.ok(short.primary.distanceTo(point(data.primaryX,data.primaryY,1.8))<1e-6);
  assert.ok(short.support.distanceTo(point(data.supportX,data.supportY,-1.6))<1e-6);
  assert.ok(Number.isFinite(short.contactError),id);
  assert.ok(short.primaryReachable,id+' firing hand must remain reachable');
 }
});
test('modular AR and AK short-stock keeps actual assembly and same muzzle frame',()=>{
 for(const [weapon,preset] of [['carbine','ar-m4a1'],['rifle','ak-akm']]){
  const configuration=selectWeaponFamilyPreset(
    initialWeaponConfiguration(weapon),preset);
  const fit=fitWeaponPose({weapon,configuration,handling:'short',
    yaw:.15,recoil:0,clearanceRetraction:2.2});
  // Both AK and AR buttplates tuck beside the right ribs.
  assert.ok(fit.stock.z>7.5&&fit.stock.z<10,preset);
  assert.ok(fit.primaryReachable,preset);
  assert.ok(Math.abs(fit.rotation.y-.15)<.05,preset);
  assert.ok(fit.contactError<8,preset);
 }
});
