import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {stockPocket,equipmentStockPush} from '../src/breach-anatomy.ts';
import {fitWeaponPose,weaponGrips} from '../src/breach-weapon-pose.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {resolveWeaponAssembly,initialWeaponConfiguration,
 selectWeaponFamilyPreset} from '../src/equipment-weapon-assemblies.ts';

const loadout=armor=>setEquipmentChoice(
 initialEquipmentLoadout('carbine'),'armor',armor);
const config=selectWeaponFamilyPreset(
 initialWeaponConfiguration('carbine'),'ar-m4a1');
const base={weapon:'carbine',configuration:config,
 handling:'ads',yaw:0,recoil:0,aimBlend:1};
const near=(a,b)=>Math.abs(a-b)<1e-5;

test('armor pushes shared physical stock and two real palm sockets forward',()=>{
 const none=equipmentStockPush(loadout('armor-none')),
   soft=equipmentStockPush(loadout('armor-soft')),
   plate=equipmentStockPush(loadout('armor-carrier'));
 assert.equal(none,0);
 assert.ok(soft>.2&&soft<plate&&plate<=1.25);
 const bare=fitWeaponPose({...base,armorPush:none}),
   carrier=fitWeaponPose({...base,armorPush:plate});
 const barePocket=stockPocket('ads',none),
   armoredPocket=stockPocket('ads',plate);
 assert.ok(near(armoredPocket.x-barePocket.x,plate));
 assert.ok(carrier.stock.x>bare.stock.x+.3);
 for(const fit of [bare,carrier]){
  const grips=weaponGrips('carbine',config,'ads');
  const t=(x,y,z)=>new THREE.Vector3(x*grips.lengthScale,y,z)
    .applyEuler(fit.rotation).add(fit.origin);
  assert.ok(fit.stock.distanceTo(t(grips.stockX,0,0))<1e-6);
  assert.ok(fit.primary.distanceTo(t(grips.primaryX,grips.primaryY,1.8))<1e-6);
  assert.ok(fit.support.distanceTo(t(grips.supportX,grips.supportY,-1.6))<1e-6);
 }
});

test('shot-time muzzle and visible rigid gun use identical armor push',()=>{
 const assembly=resolveWeaponAssembly(config);
 for(const armor of ['armor-none','armor-soft','armor-carrier']){
  const equipment=loadout(armor),armorPush=equipmentStockPush(equipment);
  const fit=fitWeaponPose({...base,armorPush});
  const grips=weaponGrips('carbine',config);
  const muzzle=new THREE.Vector3(
    assembly.muzzleX*grips.lengthScale,assembly.muzzleY,0)
    .applyEuler(fit.rotation).add(fit.origin);
  const shot=muzzleAtShot({x:0,z:0,heading:0,weaponYaw:0,
    weapon:'carbine',weaponConfiguration:config,equipment,
    aim:1,velocity:0,recoil:0,posture:'stand'});
  assert.ok(near(shot.x,muzzle.x),armor+' muzzle X mismatch');
  assert.ok(near(shot.y,26+muzzle.y),armor+' muzzle height mismatch');
  assert.ok(near(shot.z,muzzle.z),armor+' muzzle Z mismatch');
  assert.ok(near(shot.yaw,0),armor+' muzzle direction changed');
 }
});
