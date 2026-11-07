import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {arsenalFactoryChoices} from '../src/arsenal/factory-recipes.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {proposeArsenalRecipeLoad,acceptArsenalRecipeLoad}
 from '../src/arsenal/recipe-loading.ts';
import {createArsenalDraft,undoArsenalDraft} from '../src/arsenal/editor-state.ts';
test('factory picker covers all authored references, including G3, HK33 and MP5',()=>{
 const items=arsenalFactoryChoices();
 assert.equal(items.length,FAMILY_PRESETS.length);
 for(const p of FAMILY_PRESETS)assert.ok(items.some(x=>x.id===p.id),p.id);
 assert.ok(arsenalFactoryChoices('mp5').some(x=>x.name==='MP5K-PDW'));
 assert.ok(arsenalFactoryChoices('g3').some(x=>x.name==='G3A4'));
 assert.equal(arsenalFactoryChoices('g3').some(x=>x.name==='HK33A3'),false);
 assert.equal(arsenalFactoryChoices('all','mp5sd').length,2);
});
test('factory switches are complete reversible drafts, not implicit purchases',()=>{
 const old=arsenalRecipeFromLegacy(selectWeaponFamilyPreset(
  initialWeaponConfiguration('smg'),'hk-mp5a3'));
 assert.ok(old);
 const target=arsenalFactoryChoices('g3').find(x=>x.name==='G3A3');
 assert.ok(target);
 const draft=createArsenalDraft(old);
 const p=proposeArsenalRecipeLoad(draft.working,target.recipe);
 assert.ok(p.valid);assert.ok(p.changes.some(c=>c.key==='weapon'));
 assert.ok(p.changes.some(c=>c.key==='platform'));
 const next=acceptArsenalRecipeLoad(draft,p);
 assert.equal(next.working.parts.receiver,'hk-g3-drum');
 assert.equal(next.working.weapon,'rifle');
 assert.equal(next.undo.length,1);
 assert.deepEqual(undoArsenalDraft(next).working,old);
});
