import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY_PRESETS,initialWeaponFamilyBuild,proposeFamilyPartChange,
 validFamilyBuild,FAMILY_PART_SLOTS,matchingFamilyPreset}
 from '../src/equipment-weapon-families.ts';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,setWeaponAttachment,
 readWeaponConfiguration,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {attachmentPrice} from '../src/equipment-weapon-inventory.ts';
test('every factory checkpoint validates with the shared part rules',()=>{
 for(const p of FAMILY_PRESETS){
  const b=initialWeaponFamilyBuild(p.id);
  assert.ok(b&&validFamilyBuild(b,p.weapon),p.id);
 }
});
test('HK stock changes preserve other components and match factory landmarks',()=>{
 for(const [start,part,end] of [
  ['hk-mp5k','hk-mp5k-pdw-stock','hk-mp5k-pdw'],
  ['hk-hk33a2','hk33-retract-stock','hk-hk33a3'],
  ['hk-mp5a3','hk-mp5-fixed-stock','hk-mp5a2']
 ]){
  const b=initialWeaponFamilyBuild(start),p=FAMILY_PRESETS.find(x=>x.id===start);
  const n=proposeFamilyPartChange(b,p.weapon,'stock',part);
  assert.equal(n.valid,true,start);
  assert.deepEqual(n.replacements.map(x=>x.slot),['stock']);
  assert.equal(matchingFamilyPreset(n.build)?.id,end);
  for(const s of FAMILY_PART_SLOTS.filter(s=>s!=='stock'))
   assert.equal(n.build.parts[s],b.parts[s],start+' preserve '+s);
 }
});
test('receiver change reports dependent resets but retains shared MP5 components',()=>{
 const b=initialWeaponFamilyBuild('hk-mp5k-pdw');
 const n=proposeFamilyPartChange(b,'smg','receiver','hk-mp5-standard');
 assert.equal(n.valid,true);
 assert.ok(n.replacements.length>=3);
 assert.ok(n.replacements.some(x=>x.slot==='stock'));
 assert.ok(n.replacements.some(x=>x.slot==='barrel'));
 assert.equal(n.build.parts.magazine,b.parts.magazine);
 assert.equal(n.build.parts.grip,b.parts.grip);
 assert.ok(validFamilyBuild(n.build,'smg'));
 assert.deepEqual(proposeFamilyPartChange(b,'smg','receiver','hk33-556-rifle').valid,false);
});
test('AR and AK share same validator; incompatible swaps are atomic',()=>{
 for(const [p,id] of [
  ['ar-m16a1','ar-stock-m4'],
  ['ak-aks74u','ak-wood']
 ]){
  const original=FAMILY_PRESETS.find(x=>x.id===p);
  const b=initialWeaponFamilyBuild(p),n=proposeFamilyPartChange(b,original.weapon,'stock',id);
  assert.equal(n.valid,false,p);assert.equal(n.build,b);
  assert.deepEqual(n.replacements,[]);
 }
});
test('MP5 slim handguard preserves standard receiver and rejects SD',()=>{
 const a=initialWeaponFamilyBuild('hk-mp5a3');
 const n=proposeFamilyPartChange(a,'smg','handguard','hk-mp5-slim');
 assert.equal(n.valid,true);assert.equal(n.build.parts.receiver,a.parts.receiver);
 assert.deepEqual(n.replacements.map(x=>x.slot),['handguard']);
 const sd=initialWeaponFamilyBuild('hk-mp5sd3');
 assert.equal(proposeFamilyPartChange(sd,'smg','handguard','hk-mp5-slim').valid,false);
});
test('HK claw rail and actual sight coexist with legacy save and stock IDs',()=>{
 const base=selectWeaponFamilyPreset(initialWeaponConfiguration('smg'),'hk-mp5a3');
 const mounted=setWeaponAttachment(base,'opticMount','optic-hk-claw');
 assert.equal(mounted.slots.opticMount,'optic-hk-claw');
 const scoped=setWeaponAttachment(mounted,'optic','optic-reflex');
 assert.equal(scoped.slots.optic,'optic-reflex');
 assert.equal(scoped.slots.opticMount,'optic-hk-claw');
 assert.equal(attachmentPrice('optic-hk-claw'),110);
 assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(scoped)),'smg'),scoped);
 const gun=buildWeaponSilhouette('smg',new THREE.MeshBasicMaterial(),
  new THREE.MeshBasicMaterial(),scoped);
 assert.equal(gun.children.filter(x=>x.userData.hkClawMount).length,8);
 const accessory=buildWeaponAccessories(scoped,new THREE.MeshBasicMaterial(),
  new THREE.MeshBasicMaterial());
 assert.ok(accessory.children.length>=3);
 const top=gun.children.find(x=>x.userData.hkClawMount==='rail');
 const baseY=new THREE.Box3().setFromObject(top).max.y;
 assert.ok(new THREE.Box3().setFromObject(accessory).min.y>baseY-.2,
  'optic must be seated above actual rail');
 clearWeaponSilhouette(gun);
 accessory.traverse(x=>{if(x.geometry)x.geometry.dispose()});
 const without=setWeaponAttachment(scoped,'opticMount','optic-mount-none');
 assert.equal(without.slots.optic,'optic-irons');
 const legacy=readWeaponConfiguration({...base,slots:{
  ...base.slots,opticMount:undefined,optic:'optic-hk-claw'
 }},'smg');
 assert.equal(legacy.slots.opticMount,'optic-hk-claw');
 assert.equal(legacy.slots.optic,'optic-irons');
});
test('AR integrated top and AK rail remain compatible under shared mounting rules',()=>{
 const ar=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
 const arOptic=setWeaponAttachment(ar,'optic','optic-reflex');
 assert.equal(arOptic.slots.optic,'optic-reflex');
 assert.equal(arOptic.slots.opticMount,'optic-mount-none');
 const ak=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'ak-ak74m');
 assert.equal(setWeaponAttachment(ak,'optic','optic-reflex'),ak);
 const fixed=proposeFamilyPartChange(ak.build,'rifle','handguard','ak-rail-long');
 assert.equal(fixed.valid,true);
 const withRail=readWeaponConfiguration({...ak,build:fixed.build},'rifle');
 assert.equal(setWeaponAttachment(withRail,'optic','optic-reflex').slots.optic,
  'optic-reflex');
});
