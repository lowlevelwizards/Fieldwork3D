import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Operator Lab offers exact personal Arsenal recipes in regular Poses category',()=>{
 const html=file('operator-lab.html'),lab=file('src/breach-operator-lab.ts');
 for(const id of ['poseSavedWeapon','poseSavedWeaponHint'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const token of ['loadArsenalBuildLibrary','readArsenalRecipe','arsenalRecipeToLegacy',
  'savedWeaponConfig','weaponConfiguration:exactWeaponConfig'])
  assert.ok(lab.includes(token),token);
 assert.match(lab,/track!=='reload-shotgun'&&poseArsenalRecipe/);
});
test('Factory choice, base class change and unequip clear saved override',()=>{
 const lab=file('src/breach-operator-lab.ts');
 assert.match(lab,/poseWeaponSelect\.addEventListener\('change',[\s\S]*?poseArsenalRecipe=null/);
 assert.match(lab,/weapon\.addEventListener\('change',[\s\S]*?poseArsenalRecipe=null/);
 assert.match(lab,/poseSavedWeaponSelect\.addEventListener\('change'/);
 assert.match(lab,/canvas\.dataset\.poseFitSavedWeapon/);
});
