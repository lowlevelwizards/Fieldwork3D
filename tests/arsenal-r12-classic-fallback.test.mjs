import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Campaign puts classic factory and socket options behind one fallback',()=>{
 const code=src('src/campaign-ui.ts');
 assert.match(code,/campaign-legacy-weapons/);
 assert.match(code,/legacyControls\.open=!build\|\|this\.weaponView/);
 assert.match(code,/legacyControls\.append\(familyEditor\)/);
 assert.match(code,/legacyControls\.append\(attachments\)/);
 assert.match(code,/legacyControls\.open=true/);
 assert.match(code,/OPEN ARSENAL/);
});
test('Quick Play Arsenal remains primary while class-only weapons expose fallback',()=>{
 const code=src('src/breach-main.ts');
 assert.match(code,/OPEN ARSENAL · FULL WORKBENCH/);
 assert.match(code,/legacyControls\.open=!member\.weaponConfiguration\.build/);
 assert.match(code,/legacyControls\.append\(factoryLabel,factoryBrowser\)/);
 assert.match(code,/legacyControls\.append\(weaponEditor\)/);
 assert.match(code,/legacyControls\.addEventListener\('toggle',syncWorkbench\)/);
 assert.match(code,/loadout\.group\.weapon\.open&&legacyControls\.open&&weaponEditor\.open/);
});
test('Magazine resupply and operators stay outside the classic fallback drawer',()=>{
 const code=src('src/breach-main.ts');
 assert.match(code,/loadout\.field\('weapon'\)\.append\(resupply\)/);
 assert.match(code,/loadout\.field\('weapon'\)\.append\(legacyControls\)/);
});
