import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {createArsenalDraft,undoArsenalDraft,redoArsenalDraft}
 from '../src/arsenal/editor-state.ts';
import {proposeArsenalRecipeLoad,acceptArsenalRecipeLoad,
 arsenalRecipeDifferenceLabel} from '../src/arsenal/recipe-loading.ts';
const recipe=id=>{
 const factory=FAMILY_PRESETS.find(f=>f.id===id);assert.ok(factory);
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(factory.weapon),id);
 const result=arsenalRecipeFromLegacy(cfg);assert.ok(result);return result;
};
test('loads a whole recipe atomically, lists every changed part and undoes in one step',()=>{
 const a=recipe('hk-mp5a3'),b=recipe('hk-mp5sd2');
 const draft=createArsenalDraft(a);
 const p=proposeArsenalRecipeLoad(a,b);
 assert.equal(p.valid,true);
 assert.ok(p.changes.length>2);
 assert.ok(p.changes.some(x=>x.key==='receiver'));
 assert.ok(p.changes.some(x=>x.key==='barrel'));
 assert.ok(p.changes.some(x=>x.key==='stock'));
 assert.ok(p.changes.every(x=>arsenalRecipeDifferenceLabel(x).includes('→')));
 assert.deepEqual(draft.working,a,'proposal never mutates workbench state');
 const loaded=acceptArsenalRecipeLoad(draft,p);
 assert.deepEqual(loaded.working,b);
 assert.equal(loaded.undo.length,1);
 assert.deepEqual(undoArsenalDraft(loaded).working,a);
 assert.deepEqual(redoArsenalDraft(undoArsenalDraft(loaded)).working,b);
});
test('cross-platform and gameplay-class changes are disclosed explicitly',()=>{
 const p=proposeArsenalRecipeLoad(recipe('hk-mp5a3'),recipe('hk-g3a3'));
 assert.equal(p.valid,true);
 assert.ok(p.changes.some(x=>x.key==='platform'));
 assert.ok(p.changes.some(x=>x.key==='weapon'));
});
test('invalid and unchanged recipes cannot contaminate the current working draft',()=>{
 const r=recipe('ar-m4a1'),draft=createArsenalDraft(r);
 assert.equal(acceptArsenalRecipeLoad(draft,proposeArsenalRecipeLoad(r,r)),draft);
 assert.equal(acceptArsenalRecipeLoad(draft,
  proposeArsenalRecipeLoad(r,{version:2,parts:{receiver:'bogus'}})),draft);
 assert.deepEqual(draft.working,r);
});
