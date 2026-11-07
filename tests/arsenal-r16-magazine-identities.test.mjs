import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY_PRESETS,FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {WEAPONS} from '../src/breach-combat.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {ARSENAL_MAGAZINE_CAPACITIES,arsenalMagazineIdentity,
 compareArsenalMagazineWithSimulation,arsenalMagazineCatalogIssues}
 from '../src/arsenal/magazine-identities.ts';
test('all authored magazines have an explicitly mapped nominal physical capacity',()=>{
 assert.deepEqual(arsenalMagazineCatalogIssues(),[]);
 assert.equal(Object.keys(ARSENAL_MAGAZINE_CAPACITIES).length,
  Object.values(FAMILY_PARTS).filter(p=>p.slot==='magazine').length);
 for(const [id,expected] of [
  ['ar-mag20',20],['ar-mag30',30],['ak-rpk-mag45',45],
  ['hk-g3-mag20',20],['hk556-mag25',25],['hk556-mag30',30],
  ['hk9-mag30',30],['ak-rpk-mag45-plum',45]
 ])assert.equal(arsenalMagazineIdentity(id)?.nominalRounds,expected,id);
 assert.equal(arsenalMagazineIdentity('ak-wood'),undefined);
});
test('every factory reference resolves visual feed and reports legacy class mismatch without writing ammo',()=>{
 const original=structuredClone(WEAPONS);
 for(const preset of FAMILY_PRESETS){
  const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),preset.id);
  const recipe=arsenalRecipeFromLegacy(cfg);assert.ok(recipe,preset.id);
  const report=compareArsenalMagazineWithSimulation(recipe);
  assert.ok(report,preset.id);
  assert.equal(report.partId,preset.parts.magazine,preset.id);
  assert.equal(report.simulatedCapacity,WEAPONS[preset.weapon].capacity);
  assert.equal(report.simulatedReserve,WEAPONS[preset.weapon].reserve);
 }
 assert.deepEqual(WEAPONS,original,'nominal profiles may never rebalance existing gameplay');
});
test('material variants preserve magazine rounds and feed',()=>{
 for(const [a,b] of [
  ['ak-mag762poly','ak-mag762poly-plum'],
  ['ak-mag545poly','ak-mag545-plum'],
  ['ak-rpk-mag45','ak-rpk-mag45-plum']
 ]){
  assert.equal(arsenalMagazineIdentity(a).nominalRounds,
   arsenalMagazineIdentity(b).nominalRounds);
  assert.equal(arsenalMagazineIdentity(a).feed,
   arsenalMagazineIdentity(b).feed);
 }
});
