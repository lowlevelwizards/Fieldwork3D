import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY_PRESETS,initialWeaponFamilyBuild,proposeFamilyPartChange,
 validFamilyBuild,FAMILY_PART_SLOTS,matchingFamilyPreset}
 from '../src/equipment-weapon-families.ts';
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
