import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy,copyArsenalRecipe}
 from '../src/arsenal/recipes.ts';
import {arsenalHandlingStats,arsenalStatDeltas}
 from '../src/arsenal/handling-stats.ts';

const recipe=(id,weapon)=>arsenalRecipeFromLegacy(selectWeaponFamilyPreset(
 initialWeaponConfiguration(weapon),id));
const profile=(id,weapon)=>arsenalHandlingStats(recipe(id,weapon));
const stat=(rows,id)=>rows.find(row=>row.id===id);
test('H1 Workbench projects eight bounded, inspectable, consistent metrics',()=>{
 for(const [id,weapon] of [
  ['ar-m4a1','carbine'],['ar-m16a2','rifle'],['hk-mp5a3','smg'],
  ['hk-mp5k','smg'],['ak-aks74u','carbine'],['hk-g3a3','rifle'],
  ['fal-5000','rifle'],['fnc-service','rifle'],['g36-service','rifle']
 ]){
  const rows=profile(id,weapon);
  assert.equal(rows.length,8,id);
  assert.deepEqual(rows.map(r=>r.id),
   ['near','precision','turn','control','reload','compact','noise','capacity']);
  for(const row of rows){
   assert.ok(Number.isInteger(row.score)&&row.score>=0&&row.score<=100,
    id+'/'+row.id);
   assert.ok(row.label&&row.detail&&row.explanation);
  }
 }
});
test('H1 stats show real compactness and stockless handling tradeoffs',()=>{
 const m4=profile('ar-m4a1','carbine'),m16=profile('ar-m16a2','rifle');
 const k=profile('hk-mp5k','smg'),mp5=profile('hk-mp5a3','smg');
 assert.ok(stat(m4,'compact').score>stat(m16,'compact').score);
 assert.ok(stat(k,'turn').score>=stat(mp5,'turn').score);
 assert.ok(stat(k,'control').score<stat(mp5,'control').score);
 assert.ok(stat(k,'compact').score>stat(mp5,'compact').score);
});
test('H1 attachment change shows favorable and unfavorable deltas',()=>{
 const old=recipe('ar-m4a1','carbine');
 const configured=setWeaponAttachment(selectWeaponFamilyPreset(
  initialWeaponConfiguration('carbine'),'ar-m4a1'),'muzzle','muzzle-suppressor');
 const suppressed=arsenalRecipeFromLegacy(configured);
 assert.ok(suppressed);
 const before=arsenalHandlingStats(old),after=arsenalHandlingStats(suppressed);
 const changes=arsenalStatDeltas(after,before);
 assert.ok(changes.get('compact')<0,'added muzzle length reduces compactness');
 assert.ok(changes.get('turn')<0,'suppressor balance reduces swing speed');
 assert.ok(changes.get('noise')>0,'suppressor actually reduces hearing radius');
 assert.equal(arsenalStatDeltas(before,before).get('compact'),0);
 assert.equal(arsenalStatDeltas(before,null).get('compact'),0);
});
test('H1 stats are deterministic and do not edit saved recipes',()=>{
 const saved=recipe('g36-service','rifle');
 const snapshot=copyArsenalRecipe(saved);
 assert.deepEqual(arsenalHandlingStats(saved),arsenalHandlingStats(saved));
 assert.deepEqual(saved,snapshot);
 assert.equal(arsenalHandlingStats({...saved,parts:{...saved.parts,receiver:'unknown'}}),null);
});
