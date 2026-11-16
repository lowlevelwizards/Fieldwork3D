/** A3 regression: reflex window must face down the firearm, not sideways. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,setWeaponAttachment}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER}
 from '../src/weapons/geometry/weapon-visual-palette.ts';

function build(preset,weapon,claw){
 let config=selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),preset);
 assert.equal(config.build?.parts.receiver!==undefined,true);
 if(claw){
  config=setWeaponAttachment(config,'opticMount','optic-hk-claw');
  assert.equal(config.slots.opticMount,'optic-hk-claw');
 }
 config=setWeaponAttachment(config,'optic','optic-reflex');
 assert.equal(config.slots.optic,'optic-reflex');
 return config;
}
for(const [name,config] of [
 ['AR flat-top',build('ar-m4a1','carbine',false)],
 ['HK claw rail',build('hk-g3a3','rifle',true)]
]){
 test('reflex window faces forward along +X on '+name,()=>{
  const group=buildWeaponAccessories(config,WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER);
  const hood=group.getObjectByName('weapon-accessory-optic-reflex-hood');
  const base=group.getObjectByName('weapon-accessory-optic-reflex-base');
  assert.ok(hood instanceof THREE.Mesh);
  assert.ok(base instanceof THREE.Mesh);
  const bounds=new THREE.Box3().setFromObject(hood);
  const size=bounds.getSize(new THREE.Vector3());
  assert.ok(size.z>size.x*2,'window width must span the gun, not its length');
  assert.ok(Math.abs(size.x-.9)<.003,'keep existing slim hood thickness');
  assert.ok(Math.abs(size.y-2.8)<.003,'preserve its height');
  const front=new THREE.Vector3(hood.position.x+10,hood.position.y,hood.position.z);
  const towardRear=new THREE.Vector3(-1,0,0);
  const ray=new THREE.Raycaster(front,towardRear,0,20);
  assert.equal(ray.intersectObject(hood).length,0,'forward line of sight must pass through the open window');
  ray.ray.origin.y+=1.20;
  assert.ok(ray.intersectObject(hood).length>0,'upper visible bezel must remain solid');
  if(config.slots.opticMount==='optic-hk-claw'){
   const body=buildWeaponSilhouette(config.weapon,WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER,config);
   const rail=body.getObjectByName('family-art-hk-claw-assembly');
   assert.ok(rail instanceof THREE.Mesh);
   const railTop=new THREE.Box3().setFromObject(rail).max.y;
   const baseBottom=new THREE.Box3().setFromObject(base).min.y;
   assert.ok(Math.abs(railTop-baseBottom)<.20,'sight base remains seated on HK rail');
   clearWeaponSilhouette(body);
  }
  group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});
 });
}
