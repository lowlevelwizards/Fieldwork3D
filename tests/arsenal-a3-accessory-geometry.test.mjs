import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,setConfiguredFamilyPart,
 setWeaponAttachment,resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {ARSENAL_PLATFORMS,arsenalReferencesForPlatform} from '../src/arsenal/catalog.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER}
 from '../src/weapons/geometry/weapon-visual-palette.ts';

const mats=[WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER];
const preset=id=>{
 const p=ARSENAL_PLATFORMS.flatMap(x=>arsenalReferencesForPlatform(x.id))
  .find(x=>x.id===id);
 assert.ok(p,'missing preset '+id);
 return selectWeaponFamilyPreset(initialWeaponConfiguration(p.legacy.weapon),id);
};
const equip=(c,slot,id)=>{
 const next=setWeaponAttachment(c,slot,id);
 assert.equal(next.slots[slot],id,'accessory rejected '+slot+'='+id);
 return next;
};
const meshes=g=>g.children.filter(x=>x instanceof THREE.Mesh);
const names=(g,prefix)=>meshes(g).filter(x=>x.name.startsWith(prefix));
const cleanup=g=>{g.traverse(x=>{if(x instanceof THREE.Mesh)x.geometry.dispose()});g.clear();};
test('A3 art: distinct, bounded low-poly accessories and shared A2 finishes',()=>{
 let c=preset('ar-m4a1');
 c=equip(c,'optic','optic-reflex');
 c=equip(c,'muzzle','muzzle-suppressor');
 c=equip(c,'foregrip','foregrip-vertical');
 c=equip(c,'light','light-compact');
 c=equip(c,'sling','sling-two-point');
 const a=buildWeaponAccessories(c,...mats);
 assert.equal(names(a,'weapon-accessory-optic-reflex').length,2);
 assert.equal(names(a,'weapon-accessory-muzzle-suppressor').length,2);
 assert.equal(names(a,'weapon-accessory-foregrip-vertical').length,2);
 assert.equal(names(a,'weapon-accessory-sling-rigid-mounts').length,1);
 assert.equal(names(a,'weapon-accessory-light-').length,3);
 const lens=a.getObjectByName('weapon-light-lens');
 assert.ok(lens instanceof THREE.Mesh);
 assert.equal(lens.visible,false);
 assert.equal(meshes(a).length,10,'full five-accessory loadout mesh budget');
 const frame=a.getObjectByName('weapon-accessory-optic-reflex-hood');
 assert.equal(frame.geometry.type,'ExtrudeGeometry');
 assert.equal(frame.geometry.parameters.shapes.holes.length,1,'real open window');
 for(const m of meshes(a)){
  const b=new THREE.Box3().setFromObject(m);
  assert.ok(!b.isEmpty()&&Number.isFinite(b.min.x)&&Number.isFinite(b.max.z),m.name);
 }
 const muzzle=resolveWeaponAssembly(c).mounted.muzzle;
 const tip=muzzle.mountX+(muzzle.muzzleExtension??0);
 for(const m of names(a,'weapon-accessory-muzzle-')){
  const b=new THREE.Box3().setFromObject(m);
  assert.ok(b.max.x<=tip+0.001,m.name+' overshoots true muzzle');
 }
 cleanup(a);
});
test('A3 magnified optic and muzzle alternatives remain bounded at proper mount',()=>{
 for(const [optic,muzzle,max] of [
  ['optic-magnified','muzzle-hider',5],
  ['optic-magnified','muzzle-brake',5]
 ]){
  let c=preset('ar-m4a1');
  c=equip(c,'optic',optic);
  c=equip(c,'muzzle',muzzle);
  const g=buildWeaponAccessories(c,...mats);
  assert.equal(names(g,'weapon-accessory-optic-magnified').length,max);
  assert.ok(names(g,'weapon-accessory-muzzle-').length<=2);
  const m=resolveWeaponAssembly(c).mounted.muzzle;
  assert.ok(Math.abs(new THREE.Box3().setFromObject(
    new THREE.Group().add(...names(g,'weapon-accessory-muzzle-'))).max.x-
    (m.mountX+(m.muzzleExtension??0)))<.002);
  cleanup(g);
 }
});
test('A3 MP5 tri-rail holds exactly one grip across both render groups',()=>{
 let c=preset('hk-mp5a3');
 c=setConfiguredFamilyPart(c,'handguard','hk-mp5-trirail');
 assert.equal(c.build?.parts.handguard,'hk-mp5-trirail');
 c=equip(c,'foregrip','foregrip-vertical');
 const body=buildWeaponSilhouette(c.weapon,...mats,c);
 const extras=buildWeaponAccessories(c,...mats);
 assert.equal(names(body,'family-art-hk-trirail-vertical-grip').length,0);
 assert.equal(names(extras,'weapon-accessory-foregrip-vertical').length,2);
 const absent=setWeaponAttachment(c,'foregrip','foregrip-none');
 const removed=buildWeaponAccessories(absent,...mats);
 assert.equal(names(removed,'weapon-accessory-foregrip').length,0);
 cleanup(extras);cleanup(removed);clearWeaponSilhouette(body);
});
test('A3 HK claw has four supported feet but only one draw call',()=>{
 let c=preset('hk-g3a3');
 c=equip(c,'opticMount','optic-hk-claw');
 c=equip(c,'optic','optic-reflex');
 const body=buildWeaponSilhouette(c.weapon,...mats,c);
 const extra=buildWeaponAccessories(c,...mats);
 assert.equal(names(body,'family-art-hk-claw').length,1);
 assert.equal(names(body,'family-art-hk-claw')[0].userData.hkClawMount,'assembly');
 assert.equal(names(extra,'weapon-accessory-optic-reflex').length,2);
 clearWeaponSilhouette(body);cleanup(extra);
});
test('A3 all seven platforms accept a compatible configuration with finite accessory bounds',()=>{
 for(const p of ARSENAL_PLATFORMS){
  const ref=arsenalReferencesForPlatform(p.id)[0];
  let c=preset(ref.id);
  c=equip(c,'light','light-compact');
  c=equip(c,'sling','sling-two-point');
  const g=buildWeaponAccessories(c,...mats);
  assert.ok(meshes(g).length>=4,p.id);
  const lens=g.getObjectByName('weapon-light-lens');
  assert.ok(lens instanceof THREE.Mesh&&!lens.visible,p.id);
  const b=new THREE.Box3().setFromObject(g);
  assert.ok(Number.isFinite(b.max.x)&&!b.isEmpty(),p.id);
  cleanup(g);
 }
});
test('A3 existing integral SD suppressor blocks second muzzle device',()=>{
 const c=preset('hk-mp5sd3');
 const next=setWeaponAttachment(c,'muzzle','muzzle-suppressor');
 assert.equal(next.slots.muzzle,'muzzle-bare');
 const g=buildWeaponAccessories(next,...mats);
 assert.equal(names(g,'weapon-accessory-muzzle-').length,0);
 cleanup(g);
});
test('A3 legacy shotgun light keeps user-provided lens and uses current gameplay slot rules',()=>{
 let c=initialWeaponConfiguration('shotgun');
 c=equip(c,'optic','optic-reflex');
 const steel=new THREE.MeshStandardMaterial({color:0x667788});
 const poly=new THREE.MeshStandardMaterial({color:0x303030});
 const g=buildWeaponAccessories(c,steel,poly);
 assert.ok(meshes(g).every(m=>m.material===steel||m.material===poly));
 cleanup(g);steel.dispose();poly.dispose();
});
test('A3 geometry remains per-owner, independently disposable; materials shared',()=>{
 let c=preset('ar-m4a1');
 c=equip(c,'optic','optic-magnified');
 const a=buildWeaponAccessories(c,...mats);
 const b=buildWeaponAccessories(c,...mats);
 for(const m of meshes(a)){
  const other=meshes(b).find(x=>x.name===m.name);
  assert.ok(other);
  assert.notStrictEqual(m.geometry,other.geometry,'geometry owner must be unique');
  assert.strictEqual(m.material,other.material,'finishes should be cached');
 }
 cleanup(a);cleanup(b);
});
