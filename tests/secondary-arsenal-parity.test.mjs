import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {factoryGlockRecipe,readGlockRecipe,emptyGlockLibrary,
 createGlockSavedBuild,renameGlockSavedBuild,duplicateGlockSavedBuild,
 deleteGlockSavedBuild,readGlockLibrary} from '../src/arsenal/glock-saved-builds.ts';

test('Secondary Arsenal: builds are recipes, never loaded ammunition or operator stock',()=>{
 const base=factoryGlockRecipe('glock-g19x');
 assert.deepEqual(base.spares,['belt','belt']);
 assert.equal('loadedRounds' in base,false);
 assert.equal('loadedMagazineId' in base,false);
 const lib=createGlockSavedBuild(emptyGlockLibrary(),base,'  Duty   Glock   ');
 assert.ok(lib);assert.equal(lib.build.name,'Duty Glock');
 const serialized=JSON.stringify(lib.library);
 const loaded=readGlockLibrary(serialized);
 assert.deepEqual(loaded,lib.library);
 assert.equal(readGlockRecipe({version:1,model:'fake',holster:'belt-right',spares:[]}),null);
 assert.equal(readGlockRecipe({...base,spares:['invalid']}),null);
 assert.equal(readGlockRecipe({...base,spares:Array(7).fill('belt')}),null);
 assert.equal(readGlockRecipe({...base,holster:'shoulder'}),null);
});
test('Secondary Arsenal: rename/duplicate/delete and corrupt saved-build rejection',()=>{
 const first=createGlockSavedBuild(emptyGlockLibrary(),
  factoryGlockRecipe('glock-g19-gen3'),'Factory');
 const renamed=renameGlockSavedBuild(first.library,first.build.id,'My G19');
 assert.equal(renamed.builds[0].name,'My G19');
 const copy=duplicateGlockSavedBuild(renamed,first.build.id);
 assert.ok(copy);
 assert.equal(copy.library.builds.length,2);
 assert.notEqual(copy.build.id,first.build.id);
 const without=deleteGlockSavedBuild(copy.library,first.build.id);
 assert.equal(without.builds.length,1);
 assert.equal(readGlockLibrary(JSON.stringify({
  version:1,builds:[...copy.library.builds,
   {...copy.build,id:'glock-build-1',recipe:{...copy.build.recipe,model:'unrecognized'}}]
 })).builds.length,2);
 assert.equal(readGlockLibrary('{'),emptyGlockLibrary().builds);
});
test('Secondary Arsenal: same interactive presentation affordances with honest equipment gate',()=>{
 const gallery=readFileSync(new URL('../src/arsenal/glock-gallery.ts',import.meta.url),'utf8');
 const wb=readFileSync(new URL('../src/arsenal/glock-workbench.ts',import.meta.url),'utf8');
 const viewport=readFileSync(new URL('../src/arsenal/glock-viewport.ts',import.meta.url),'utf8');
 for(const token of ['arsenal-search','arsenal-filters','arsenal-grid',
  'OPEN WORKBENCH','SAVED','renameGlockSavedBuild','duplicateGlockSavedBuild',
  'deleteGlockSavedBuild','secondaryCarryClaim'])
  assert.ok(gallery.includes(token),'Missing '+token);
 for(const token of ['UNDO','REDO','FIT','SIDE','OPPOSITE',
  'CLAY','CHOOSE MODEL','LOAD BUILD','SAVE BUILD','CARRY',
  'onApply','role','dialog','SECONDARY_CAPACITY'])
  assert.ok(wb.includes(token),'Missing '+token);
 for(const token of ['pointerdown','pointermove','wheel','ResizeObserver',
  'clearGlockAppearance','setPixelRatio'])
  assert.ok(viewport.includes(token),'Missing '+token);
 assert.ok(wb.includes('No live pistol firing'));
});
