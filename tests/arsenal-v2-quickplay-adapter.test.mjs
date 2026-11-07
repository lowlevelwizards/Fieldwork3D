import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster} from '../src/breach-roster.ts';
import {WEAPONS} from '../src/breach-combat.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {quoteQuickPlayArsenalEdit,applyQuickPlayArsenalEdit}
 from '../src/arsenal/quickplay-adapter.ts';
const recipeFor=id=>{
 const target=initialRoster().members[0];
 const weapon=id.startsWith('hk-mp5')?'smg':target.weapon;
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),id);
 const recipe=arsenalRecipeFromLegacy(cfg);assert.ok(recipe);return recipe;
};
test('Quick Play applies same-class assembly without touching magazines or another operator',()=>{
 const original=initialRoster(),rook=original.members[0],other=original.members[1];
 const recipe=recipeFor('ar-m4a1');
 const updated=structuredClone(recipe);updated.parts.stock='ar-compact';
 assert.equal(quoteQuickPlayArsenalEdit(original,rook.id,updated).valid,true);
 const changed=applyQuickPlayArsenalEdit(original,rook.id,updated);
 assert.deepEqual(changed.members[0].magazines,rook.magazines);
 assert.equal(changed.members[0].magazine,rook.magazine);
 assert.deepEqual(changed.members[1],other);
 assert.equal(changed.members[0].weaponConfiguration.build.parts.stock,'ar-compact');
 assert.equal(original.members[0].weaponConfiguration.build.parts.stock,rook.weaponConfiguration.build.parts.stock);
});
test('Quick Play MP5 choice changes class explicitly via existing ammo reset path',()=>{
 const original=initialRoster(),rook=original.members[0];
 const recipe=recipeFor('hk-mp5a3');
 const q=quoteQuickPlayArsenalEdit(original,rook.id,recipe);
 assert.equal(q.valid,true);assert.equal(q.changesClass,true);
 const changed=applyQuickPlayArsenalEdit(original,rook.id,recipe);
 assert.equal(changed.members[0].weapon,'smg');
 assert.equal(changed.members[0].magazine,WEAPONS.smg.capacity);
 assert.equal(changed.members[0].reserve,WEAPONS.smg.reserve);
 assert.equal(changed.members[0].weaponConfiguration.build.parts.receiver,'hk-mp5-standard');
 assert.equal(original.members[0].weapon,rook.weapon);
 assert.equal(changed.members[1],original.members[1]);
});
test('invalid recipe or unknown operator leaves Quick Play state unchanged',()=>{
 const original=initialRoster();
 const recipe=recipeFor('ar-m4a1');
 assert.equal(applyQuickPlayArsenalEdit(original,'missing',recipe),original);
 const invalid=structuredClone(recipe);invalid.parts.receiver='hk-mp5-standard';
 assert.equal(quoteQuickPlayArsenalEdit(original,'rook',invalid).valid,false);
 assert.equal(applyQuickPlayArsenalEdit(original,'rook',invalid),original);
});
