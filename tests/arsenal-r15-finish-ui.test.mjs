import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {proposeArsenalPartChange,arsenalReferenceIdentity}
 from '../src/arsenal/compatibility.ts';
import {arsenalPhysicalPartId} from '../src/arsenal/finishes.ts';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('finish-only replacements preserve the factory silhouette identity',()=>{
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'ak-ak74');
 const base=arsenalRecipeFromLegacy(cfg);assert.ok(base);
 const initialName=arsenalReferenceIdentity(base).name;
 const p=proposeArsenalPartChange(base,'stock','ak-wood74-red');
 assert.ok(p.valid&&p.nextRecipe);
 const changed=arsenalReferenceIdentity(p.nextRecipe);
 assert.match(initialName,/AK-74/);
 assert.match(changed.name,/AK-74/);
 assert.equal(changed.modified,true);
 assert.equal(arsenalPhysicalPartId(p.nextRecipe.parts.stock),
  arsenalPhysicalPartId(base.parts.stock));
});
test('Workbench separates finished materials from physical parts and retains validation',()=>{
 const code=src('src/arsenal/workbench-screen.ts');
 for(const token of ['FINISH / MATERIAL','arsenalPhysicalPartId','renderFinishes',
  'arsenal-wb-finish-choice','proposeArsenalPartChange(draft.working,activeSlot,item.partId)',
  'commitArsenalProposal(draft,proposal)'])
  assert.ok(code.includes(token),token);
 assert.match(code,/if\(arsenalPhysicalPartId\(part\.id\)!==part\.id\)continue/);
 assert.match(code,/choice\.dataset\.fit=selected/);
});
