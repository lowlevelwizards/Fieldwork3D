/** Test-only boot of the real Workbench. No fake UI, no Campaign spending. */
import {openArsenalWorkbench} from './arsenal/workbench-screen.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,setWeaponAttachment}
 from './equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy} from './arsenal/recipes.ts';
import type {ArsenalSavedBuild} from './arsenal/saved-builds.ts';
let config=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
config=setWeaponAttachment(config,'light','light-compact');
config=setWeaponAttachment(config,'optic','optic-reflex');
config=setWeaponAttachment(config,'foregrip','foregrip-vertical');
const recipe=arsenalRecipeFromLegacy(config);
if(!recipe)throw Error('Missing M2.7 M4A1 test recipe');
openArsenalWorkbench({id:'m27-smoke',name:'Arsenal M2.7 Test',recipe} as ArsenalSavedBuild);
document.body.dataset.m27Ready='true';
