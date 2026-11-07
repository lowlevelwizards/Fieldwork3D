import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Workbench exposes explicit Save/Save Copy backed only by local personal recipe library',()=>{
 const code=src('src/arsenal/workbench-screen.ts');
 for(const token of ['createSavedArsenalBuild','overwriteSavedArsenalBuild',
  'persistArsenalBuildLibrary','saveDialog.showModal','SAVE COPY'])
  assert.ok(code.includes(token),token);
 assert.doesNotMatch(code,/equipCampaignWeapon|purchaseAndEquipWeaponAttachment/);
});
test('Gallery browses saved recipes without rebranding them as owned guns',()=>{
 const code=src('src/arsenal/gallery-main.ts');
 for(const token of ["id:'saved'","loadArsenalBuildLibrary","duplicateSavedArsenalBuild",
  "renameSavedArsenalBuild","deleteSavedArsenalBuild"])
  assert.ok(code.includes(token),token);
});
