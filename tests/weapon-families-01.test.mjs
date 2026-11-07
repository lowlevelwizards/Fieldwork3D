import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PARTS,FAMILY_PART_SLOTS,FAMILY_PRESETS,
 initialWeaponFamilyBuild,readWeaponFamilyBuild,setWeaponFamilyPart,
 compatibleFamilyPart,matchingFamilyPreset}
 from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setConfiguredFamilyPart,readWeaponConfiguration,resolveWeaponAssembly,
 setWeaponAttachment,sameWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';

test('family 01: 22 distinct AR/AK/HK presets normalize and survive saves',()=>{
 assert.equal(FAMILY_PRESETS.length,22);
 assert.equal(new Set(FAMILY_PRESETS.map(x=>x.id)).size,FAMILY_PRESETS.length);
 for(const preset of FAMILY_PRESETS){
  const build=initialWeaponFamilyBuild(preset.id);
  assert.ok(build,preset.id);
  assert.equal(matchingFamilyPreset(build)?.id,preset.id);
  for(const slot of FAMILY_PART_SLOTS){
   const id=build.parts[slot],part=FAMILY_PARTS[id];
   assert.ok(part,preset.id+' '+slot);
   assert.equal(part.slot,slot);
   assert.equal(part.family,preset.family);
   assert.equal(compatibleFamilyPart(build.parts.receiver,slot,id,preset.weapon,
    FAMILY_PARTS[build.parts.barrel].length),true,preset.id+' '+slot);
  }
  assert.deepEqual(readWeaponFamilyBuild(JSON.parse(JSON.stringify(build)),preset.weapon),build);
  const initial=initialWeaponConfiguration(preset.weapon);
  const fitted=selectWeaponFamilyPreset(initial,preset.id);
  assert.equal(fitted.weapon,preset.weapon);
  assert.equal(fitted.build?.family,preset.family);
  assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(fitted)),preset.weapon),fitted);
  assert.ok(!sameWeaponConfiguration(initial,fitted));
 }
});
test('family 01: AK magazine identity and receiver/platform restrictions',()=>{
 let c=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'ak-akm');
 const unchanged=setConfiguredFamilyPart(c,'magazine','ak-mag545poly');
 assert.equal(unchanged,c,'incompatible 5.45 profile cannot enter AKM');
 c=setConfiguredFamilyPart(c,'receiver','ak103');
 assert.equal(c.build?.parts.receiver,'ak103');
 assert.equal(FAMILY_PARTS[c.build.parts.magazine].feed,'ak762');
 assert.equal(setConfiguredFamilyPart(c,'receiver','ar-flat'),c);
 assert.equal(selectWeaponFamilyPreset(c,'ar-mk18'),c,'carbine cannot be assigned to rifle class');
 const invalid={...c,build:{family:'ak',parts:{...c.build.parts,magazine:'ar-mag30'}}};
 assert.notEqual(readWeaponConfiguration(invalid,'rifle').build?.parts.magazine,'ar-mag30');
 assert.equal(readWeaponConfiguration({...c,build:{family:'ar',parts:c.build.parts}},'rifle').build,undefined);
});
test('family 01: changing barrel rematches handguard and preserves baseline muzzle',()=>{
 let c=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
 const original=c;
 c=setConfiguredFamilyPart(c,'barrel','ar-103');
 assert.equal(c.build?.parts.barrel,'ar-103');
 assert.equal(FAMILY_PARTS[c.build.parts.handguard].length,'short');
 assert.equal(resolveWeaponAssembly(c).muzzleX,15.8);
 assert.ok(resolveWeaponAssembly(c).lengthScale<resolveWeaponAssembly(original).lengthScale);
 assert.equal(setConfiguredFamilyPart(c,'handguard','ar-round'),c);
 assert.equal(setWeaponAttachment(c,'foregrip','foregrip-vertical').slots.foregrip,'foregrip-vertical');
 const updated=setWeaponAttachment(original,'foregrip','foregrip-vertical');
 assert.notEqual(updated,original,'M4A1 rail now supports a vertical grip');
 assert.equal(updated.slots.foregrip,'foregrip-vertical');
 const retro=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-car15');
 assert.equal(setWeaponAttachment(retro,'foregrip','foregrip-vertical'),retro,
  'unrailed retro CAR-15 must continue rejecting vertical grip');
});
test('family 01: invalid persisted builds degrade to legacy without corrupting slots',()=>{
 const old=initialWeaponConfiguration('carbine');
 assert.deepEqual(readWeaponConfiguration(old,'carbine'),old);
 assert.deepEqual(readWeaponConfiguration({...old,build:{family:'ak',parts:{receiver:'missing'}}},'carbine'),old);
 assert.equal(readWeaponFamilyBuild(null,'carbine'),undefined);
 assert.equal(readWeaponFamilyBuild({family:'ak',parts:{receiver:'akm'}},'carbine'),undefined);
 assert.equal(readWeaponFamilyBuild({family:'ar',parts:{receiver:'ar-flat',stock:'ak-wood'}},'carbine')?.parts.stock,'ar-stock-m4');
});
test('family 01: all modular silhouettes align with physical tip; no per-frame art objects',()=>{
 const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
 const fingerprints=new Set();
 for(const preset of FAMILY_PRESETS){
  const c=selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),preset.id);
  const g=buildWeaponSilhouette(preset.weapon,steel,dark,c);
  const box=new THREE.Box3().setFromObject(g);
  assert.ok(Math.abs(box.max.x-resolveWeaponAssembly(c).muzzleX)<.01,preset.id+' muzzle');
  assert.ok(g.children.length>=12&&g.children.length<=(preset.family==='ar'?36:28),preset.id+' mesh budget');
  assert.ok(g.children.every(child=>child.name.startsWith('family-')));
  fingerprints.add(g.children.map(child=>child.name+JSON.stringify(child.position.toArray())).join('|'));
  clearWeaponSilhouette(g);
  assert.equal(g.children.length,0);
 }
 assert.equal(fingerprints.size,FAMILY_PRESETS.length);
 steel.dispose();dark.dispose();
});
