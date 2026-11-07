import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,readWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy,arsenalRecipeToLegacy,readArsenalRecipe}
 from '../src/arsenal/recipes.ts';
import {arsenalReferenceIdentity,proposeArsenalPartChange}
 from '../src/arsenal/compatibility.ts';
import {createArsenalDraft,editArsenalDraft,undoArsenalDraft,redoArsenalDraft,
 arsenalDraftDirty} from '../src/arsenal/editor-state.ts';
const factory=id=>{
 const p=FAMILY_PRESETS.find(x=>x.id===id);assert.ok(p,id);
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
 const r=arsenalRecipeFromLegacy(cfg);assert.ok(r,id);
 return r;
};
test('all factory variants round-trip through V2 without changing V1 combat class or parts',()=>{
 for(const p of FAMILY_PRESETS){
  const r=factory(p.id);
  assert.deepEqual(readArsenalRecipe(JSON.parse(JSON.stringify(r))),r,p.id);
  const legacy=arsenalRecipeToLegacy(r);
  assert.ok(legacy,p.id);
  assert.equal(legacy.weapon,p.weapon,p.id);
  assert.deepEqual(legacy.build.parts,p.parts,p.id);
  assert.deepEqual(readWeaponConfiguration(legacy,p.weapon),legacy,p.id);
 }
 assert.equal(arsenalRecipeFromLegacy(initialWeaponConfiguration('shotgun')),undefined,
  'generic class-only weapons must not be silently converted');
});
test('MP5A3 stock swaps to A2 with no other component resets',()=>{
 const before=factory('hk-mp5a3');
 const p=proposeArsenalPartChange(before,'stock','hk-mp5-fixed-stock');
 assert.equal(p.valid,true);assert.equal(p.requiresConfirmation,false);
 assert.deepEqual(p.changes.map(x=>x.slot),['stock']);
 assert.equal(arsenalReferenceIdentity(p.nextRecipe).referenceId,'hk-mp5a2');
});
test('MP5K PDW and HK33A3 retain their family-defining cores',()=>{
 for(const [preset,stock,target] of [
  ['hk-mp5k','hk-mp5k-pdw-stock','hk-mp5k-pdw'],
  ['hk-hk33a2','hk33-retract-stock','hk-hk33a3']]){
  const p=proposeArsenalPartChange(factory(preset),'stock',stock);
  assert.equal(p.valid,true,preset);
  assert.equal(arsenalReferenceIdentity(p.nextRecipe).referenceId,target);
 }
});
test('MP5 optic proposes exactly one mount dependency; no silent hidden resets',()=>{
 const start=factory('hk-mp5a3');
 const proposal=proposeArsenalPartChange(start,'optic','optic-reflex');
 assert.equal(proposal.valid,true);
 assert.equal(proposal.requiresConfirmation,true);
 assert.deepEqual(proposal.changes.map(x=>x.slot),['opticMount','optic']);
 assert.equal(proposal.nextRecipe.accessories.opticMount,'optic-hk-claw');
 assert.equal(proposal.nextRecipe.accessories.optic,'optic-reflex');
 const remove=proposeArsenalPartChange(proposal.nextRecipe,'opticMount','optic-mount-none');
 assert.equal(remove.valid,true);
 assert.equal(remove.requiresConfirmation,true);
 assert.equal(remove.nextRecipe.accessories.optic,'optic-irons');
});
test('integral SD suppressor rejects extra muzzle device; HK unrelated core blocked',()=>{
 assert.equal(proposeArsenalPartChange(factory('hk-mp5sd3'),
  'muzzle','muzzle-suppressor').valid,false);
 assert.equal(proposeArsenalPartChange(factory('hk-g3a3'),
  'receiver','hk33-556-rifle').valid,false);
});
test('AK receiver feed switch produces inspectable dependent changes',()=>{
 const p=proposeArsenalPartChange(factory('ak-ak74'),'receiver','ak103');
 assert.equal(p.valid,true);
 assert.equal(p.requiresConfirmation,true);
 assert.ok(p.changes.some(x=>x.slot==='magazine'));
 assert.equal(p.nextRecipe.parts.receiver,'ak103');
 assert.equal(p.nextRecipe.platformId,'ak');
});
test('draft commits only after coordinated-change confirmation and undo groups the change',()=>{
 const start=factory('hk-mp5a3');
 const draft=createArsenalDraft(start);
 const staged=editArsenalDraft(draft,'optic','optic-reflex');
 assert.equal(staged.proposal.requiresConfirmation,true);
 assert.equal(staged.draft,draft);
 const approved=editArsenalDraft(draft,'optic','optic-reflex',true).draft;
 assert.equal(approved.undo.length,1);
 assert.equal(approved.working.accessories.optic,'optic-reflex');
 assert.equal(arsenalDraftDirty(approved),true);
 const undone=undoArsenalDraft(approved);
 assert.deepEqual(undone.working,start);
 assert.equal(arsenalDraftDirty(undone),false);
 assert.deepEqual(redoArsenalDraft(undone).working,approved.working);
});
test('optics preserve meaningful reference identity while non-core add-ons modify label',()=>{
 const initial=factory('hk-mp5a3');
 assert.equal(arsenalReferenceIdentity(initial).name,'MP5A3');
 const p=proposeArsenalPartChange(initial,'optic','optic-reflex');
 assert.equal(p.valid,true);
 assert.equal(arsenalReferenceIdentity(p.nextRecipe).name,'MP5A3 · Modified');
});
