import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {ARSENAL_BUILD_STORAGE_KEY,MAX_SAVED_ARSENAL_BUILDS,emptyArsenalBuildLibrary,
 readArsenalBuildLibrary,createSavedArsenalBuild,overwriteSavedArsenalBuild,
 renameSavedArsenalBuild,duplicateSavedArsenalBuild,deleteSavedArsenalBuild}
 from '../src/arsenal/saved-builds.ts';
const recipe=()=>{
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('smg'),'hk-mp5a3');
 const result=arsenalRecipeFromLegacy(cfg);assert.ok(result);return result;
};
test('recipe library stores no Campaign serials, stock, currency or Quick Play state',()=>{
 const initial=emptyArsenalBuildLibrary();
 const saved=createSavedArsenalBuild(initial,recipe(),'MP5 Setup');
 assert.ok(saved);
 assert.deepEqual(Object.keys(saved.build).sort(),['id','name','recipe']);
 assert.deepEqual(Object.keys(saved.build.recipe).sort(),
  ['accessories','parts','platformId','sourcePresetId','version','weapon']);
 assert.match(ARSENAL_BUILD_STORAGE_KEY,/arsenal-recipes/);
});
test('save, rename, duplicate, overwrite and delete are immutable and deterministic',()=>{
 const initial=emptyArsenalBuildLibrary();
 const first=createSavedArsenalBuild(initial,recipe(),' MP5   Loadout  ');
 assert.ok(first);assert.equal(first.build.name,'MP5 Loadout');
 assert.equal(initial.builds.length,0);
 const renamed=renameSavedArsenalBuild(first.library,first.build.id,'Patrol');
 assert.ok(renamed);assert.equal(renamed.builds[0].name,'Patrol');
 const copied=duplicateSavedArsenalBuild(renamed,first.build.id);
 assert.ok(copied);assert.equal(copied.library.builds.length,2);
 assert.notEqual(copied.build.id,first.build.id);
 const second=structuredClone(recipe());second.parts.stock='hk-mp5-fixed-stock';
 const replaced=overwriteSavedArsenalBuild(copied.library,first.build.id,second);
 assert.ok(replaced);assert.equal(replaced.builds[0].recipe.parts.stock,'hk-mp5-fixed-stock');
 assert.equal(copied.library.builds[0].recipe.parts.stock,'hk-mp5-retract-stock');
 assert.equal(deleteSavedArsenalBuild(replaced,first.build.id).builds.length,1);
});
test('library reader skips corrupt, duplicate and overlong records without granting equipment',()=>{
 const saved=createSavedArsenalBuild(emptyArsenalBuildLibrary(),recipe(),'Test');
 assert.ok(saved);
 const raw={version:1,builds:[
  {...saved.build,credits:50000,weaponSerialId:'free-gun'},
  {...saved.build,name:'Duplicate'},
  {id:'bad id',name:'Invalid',recipe:recipe()},
  {id:'arsenal-33',name:'Missing',recipe:{version:2}}
 ]};
 const loaded=readArsenalBuildLibrary(raw);
 assert.equal(loaded.builds.length,1);
 assert.deepEqual(Object.keys(loaded.builds[0]).sort(),['id','name','recipe']);
 assert.deepEqual(readArsenalBuildLibrary('{broken'),emptyArsenalBuildLibrary());
});
test('saved library enforces a finite capacity',()=>{
 let lib=emptyArsenalBuildLibrary();
 for(let i=0;i<MAX_SAVED_ARSENAL_BUILDS;i++){
  const item=createSavedArsenalBuild(lib,recipe(),'Build '+i);
  assert.ok(item);lib=item.library;
 }
 assert.equal(lib.builds.length,MAX_SAVED_ARSENAL_BUILDS);
 assert.equal(createSavedArsenalBuild(lib,recipe(),'Extra'),undefined);
 assert.equal(readArsenalBuildLibrary(lib).builds.length,MAX_SAVED_ARSENAL_BUILDS);
});
