import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,purchaseAndEquipWeaponAttachment,
 equipCampaignWeaponAttachment,saveCampaignKitPreset,applyCampaignKitPreset}
 from '../src/campaign-state.ts';
import {initialRoster,readRoster} from '../src/breach-roster.ts';
import {setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {createArsenalDraft,editArsenalMountPosition}
 from '../src/arsenal/editor-state.ts';
import {physicalAttachmentFitOptions}
 from '../src/weapons/geometry/weapon-physical-mount-fit.ts';
import {commitCampaignArsenalEdit}
 from '../src/arsenal/campaign-adapter.ts';
import {applyQuickPlayArsenalEdit} from '../src/arsenal/quickplay-adapter.ts';
import {mountedAccessorySeat} from '../src/weapons/geometry/mounted-accessory-layout.ts';
const leftLocation=config=>{
 const choices=physicalAttachmentFitOptions(config,'light-compact').options;
 const left=choices.find(x=>x.face==='left');
 assert.ok(left,'model has an authored left rail');
 return left;
};
test('M2.6F kit preset saves and restores the same paid light and selected side',()=>{
 const fresh=newCampaign(819);
 const initially=purchaseAndEquipWeaponAttachment(fresh,'rook','light','light-compact');
 assert.notEqual(initially,fresh);
 const operator=initially.operators.find(x=>x.id==='rook');assert.ok(operator);
 const original=arsenalRecipeFromLegacy(operator.weaponConfiguration);
 assert.ok(original);
 const recipe=editArsenalMountPosition(createArsenalDraft(original),'light',
  leftLocation(operator.weaponConfiguration)).working;
 assert.equal(recipe.mountSelections?.light?.face,'left');
 const edited=commitCampaignArsenalEdit(initially,'rook',recipe).state;
 assert.notStrictEqual(edited,initially);
 const saved=saveCampaignKitPreset(edited,'rook','Left light');
 const preset=saved.kitPresets.at(-1);
 assert.ok(preset);
 const removed=equipCampaignWeaponAttachment(saved,'rook','light','light-none');
 assert.equal(removed.inventory.attachments['light-compact'],1);
 const restored=applyCampaignKitPreset(removed,'rook',preset.id);
 const current=restored.operators.find(x=>x.id==='rook');
 assert.ok(current);
 assert.equal(restored.inventory.attachments['light-compact'],0);
 assert.equal(restored.funds,removed.funds);
 assert.equal(current.weaponSerialId,operator.weaponSerialId);
 assert.equal(current.weaponConfiguration.mountSelections?.light?.face,'left');
 assert.equal(mountedAccessorySeat(current.weaponConfiguration,'light')?.placement.face,'left');
 assert.strictEqual(applyCampaignKitPreset(restored,'rook',preset.id),restored);
});
test('M2.6G Quick Play applies and reloads selected light side without Campaign ownership',()=>{
 const roster=initialRoster();
 const member=roster.members.find(x=>x.id==='rook');assert.ok(member);
 const config=setWeaponAttachment(member.weaponConfiguration,'light','light-compact');
 assert.equal(config.slots.light,'light-compact');
 const recipe=arsenalRecipeFromLegacy(config);assert.ok(recipe);
 const chosen=editArsenalMountPosition(createArsenalDraft(recipe),'light',
  leftLocation(config)).working;
 const applied=applyQuickPlayArsenalEdit(roster,'rook',chosen);
 const equipped=applied.members.find(x=>x.id==='rook');assert.ok(equipped);
 assert.equal(equipped.weaponConfiguration.mountSelections?.light?.face,'left');
 assert.equal(mountedAccessorySeat(equipped.weaponConfiguration,'light')?.placement.face,'left');
 const reloaded=readRoster(JSON.stringify(applied));
 assert.equal(reloaded.members.find(x=>x.id==='rook').weaponConfiguration.mountSelections?.light?.face,
  'left');
 assert.deepEqual(readRoster(JSON.stringify(reloaded)),reloaded);
});