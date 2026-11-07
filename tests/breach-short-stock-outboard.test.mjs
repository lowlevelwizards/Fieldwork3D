import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {stockPocket,ANATOMY} from '../src/breach-anatomy.ts';
import {fitWeaponPose,weaponGrips} from '../src/breach-weapon-pose.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
test('short-stock seats outboard of firing shoulder, not the sternum',()=>{
 const ready=stockPocket('ready'),short=stockPocket('short');
 assert.ok(short.z>ANATOMY.shoulderRight.z+2);
 assert.ok(short.z>ready.z+2.3);
 assert.ok(short.y<ready.y,'compact below-shoulder short stock');
});
test('short-stock moves the whole rigid gun and BOTH contact sockets right',()=>{
 for(const id of ['carbine','smg','rifle','shotgun']){
  const ready=fitWeaponPose({weapon:id,handling:'ready',yaw:0,recoil:0});
  const short=fitWeaponPose({weapon:id,handling:'short',yaw:0,recoil:0});
  assert.ok(short.stock.z-ready.stock.z>1.5,id);
  const data=weaponGrips(id);
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
  console.log('SHORT_STOCK_DIAG',preset,'stock',fit.stock.toArray(),
    'primaryReachable',fit.primaryReachable,'contactError',fit.contactError);
  assert.ok(fit.stock.z>8.8,preset);
  assert.ok(fit.primaryReachable,preset);
  assert.ok(Math.abs(fit.rotation.y-.15)<.05,preset);
  assert.ok(fit.contactError<8,preset);
 }
});
