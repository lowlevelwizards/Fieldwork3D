import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,setWeaponAttachment,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

test('19.03 muzzle attachments end at the authoritative modeled barrel tip',()=>{
 const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
 for(const weapon of ['carbine','smg','rifle']){
  const defaults=initialWeaponConfiguration(weapon);
  for(const muzzle of ['muzzle-hider','muzzle-brake','muzzle-suppressor']){
   const config=setWeaponAttachment(defaults,'muzzle',muzzle);
   const addons=buildWeaponAccessories(config,steel,dark);
   const box=new THREE.Box3().setFromObject(addons);
   assert.ok(Math.abs(box.max.x-resolveWeaponAssembly(config).muzzleX)<.01,
    weapon+' '+muzzle+' has inconsistent muzzle tip');
   clearWeaponSilhouette(addons);
  }
 }
 steel.dispose();dark.dispose();
});
test('19.03 visible stock length matches the selected stock contact location',()=>{
 const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
 const base=initialWeaponConfiguration('rifle');
 for(const stock of ['stock-compact','stock-standard','stock-extended']){
  const config=setWeaponAttachment(base,'stock',stock);
  const mesh=buildWeaponSilhouette('rifle',steel,dark,config);
  const rear=new THREE.Box3().setFromObject(mesh).min.x;
  assert.ok(Math.abs(rear-resolveWeaponAssembly(config).stockX)<.08,stock);
  clearWeaponSilhouette(mesh);
 }
 steel.dispose();dark.dispose();
});
test('19.03 accessory meshes show actual differences and can be cleaned up',()=>{
 const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
 let config=initialWeaponConfiguration('carbine');
 const empty=buildWeaponAccessories(config,steel,dark);
 config=setWeaponAttachment(config,'optic','optic-reflex');
 config=setWeaponAttachment(config,'foregrip','foregrip-vertical');
 config=setWeaponAttachment(config,'light','light-compact');
 config=setWeaponAttachment(config,'sling','sling-two-point');
 const full=buildWeaponAccessories(config,steel,dark);
 assert.ok(full.children.length>empty.children.length+5);
 clearWeaponSilhouette(full);clearWeaponSilhouette(empty);
 assert.equal(full.children.length,0);
 steel.dispose();dark.dispose();
});
