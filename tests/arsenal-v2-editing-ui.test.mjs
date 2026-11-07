import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWeaponConfiguration,selectWeaponFamilyPreset} from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {createArsenalDraft,editArsenalDraft} from '../src/arsenal/editor-state.ts';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('unified part browser is driven by proposals and drafts, not old workbench mode toggles',()=>{
 const code=src('src/arsenal/workbench-screen.ts');
 for(const symbol of ['arsenalPartsForSlot','proposeArsenalPartChange',
  'commitArsenalProposal','undoArsenalDraft','redoArsenalDraft','ArsenalViewport'])
  assert.ok(code.includes(symbol),symbol);
 assert.doesNotMatch(code,/setMode\(|BODY PARTS|ACCESSORY MOUNTS|socketButtons/);
 assert.doesNotMatch(code,/equipCampaignWeapon|purchaseAndEquipWeaponAttachment/);
});
test('normal edit applies immediately while coordinated optic change remains uncommitted until accepted',()=>{
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration('smg'),'hk-mp5a3');
 const recipe=arsenalRecipeFromLegacy(config);
 assert.ok(recipe);
 const start=createArsenalDraft(recipe);
 const stock=editArsenalDraft(start,'stock','hk-mp5-fixed-stock');
 assert.equal(stock.proposal.valid,true);
 assert.equal(stock.proposal.requiresConfirmation,false);
 assert.equal(stock.draft.working.parts.stock,'hk-mp5-fixed-stock');
 const optic=editArsenalDraft(start,'optic','optic-reflex');
 assert.equal(optic.proposal.valid,true);
 assert.equal(optic.proposal.requiresConfirmation,true);
 assert.equal(optic.draft,start);
});
