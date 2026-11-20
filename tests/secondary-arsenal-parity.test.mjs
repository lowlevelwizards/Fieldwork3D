import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildGlockAppearance,clearGlockAppearance}
 from '../src/weapons/geometry/glock-family-silhouettes.ts';
import {normalizeGlockCustomization,readGlockCustomization,
 defaultGlockCustomization}
 from '../src/weapons/geometry/glock-customization.ts';
import {initialSecondaryEquipment,readSecondaryEquipment,secondaryRoundTotal,
 secondaryLoadMass} from '../src/secondary-equipment.ts';
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
 assert.deepEqual(readGlockLibrary('{'),emptyGlockLibrary());
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
 assert.ok(wb.includes('Pistol firing and weapon-light illumination await live integration.'));
});

test('P6: physically mounted optic and light are real compact geometry, not preview overlays',()=>{
 const selected={finish:'coyote',optic:'micro',light:'compact'};
 assert.equal(readGlockCustomization('glock-g19-gen5-mos',selected)?.optic,'micro');
 assert.equal(readGlockCustomization('glock-g26',selected),null);
 const normalized=normalizeGlockCustomization('glock-g26',selected);
 assert.equal(normalized.optic,'none');
 assert.equal(normalized.light,'none');
 const installed=buildGlockAppearance('glock-g19-gen5-mos',{customization:selected});
 assert.ok(installed.getObjectByName('glock-installed-micro-optic'));
 assert.ok(installed.getObjectByName('glock-installed-rail-light'));
 assert.ok(installed.getObjectByName('glock-optic-window'));
 clearGlockAppearance(installed);
 const factory=buildGlockAppearance('glock-g19-gen5-mos',{
  customization:defaultGlockCustomization()});
 assert.equal(factory.getObjectByName('glock-installed-micro-optic'),undefined);
 clearGlockAppearance(factory);
});
test('P6: hot-swapped secondary hardware conserves owned ammo and affects only physical mass',()=>{
 const base=initialSecondaryEquipment('rook','glock-g19-gen5-mos');
 const modified={...base,customization:{finish:'black',optic:'micro',light:'compact'}};
 const total=secondaryRoundTotal(modified);
 const read=readSecondaryEquipment(JSON.stringify(modified),'rook');
 // Loadout reader takes the saved object, not a serialized string.
 const restored=readSecondaryEquipment(modified,'rook');
 assert.equal(read.weapon,null);
 assert.equal(restored.customization.optic,'micro');
 assert.equal(restored.customization.light,'compact');
 assert.equal(secondaryRoundTotal(restored),total);
 assert.ok(secondaryLoadMass(restored)>secondaryLoadMass(base));
 assert.equal(readSecondaryEquipment({
  ...modified,weapon:'glock-g26'},'rook').weapon,null,
  'a forged sidearm model cannot reuse another model serial inventory');
});
test('P6: saved V1 recipes migrate visually without creating ammunition',()=>{
 const legacy={version:1,model:'glock-g19-gen5-mos',
  holster:'belt-right',spares:['belt','belt']};
 const valid=readGlockRecipe(legacy);
 assert.equal(valid.customization.optic,'none');
 const modified={...valid,customization:{finish:'coyote',optic:'micro',light:'compact'}};
 assert.equal(readGlockRecipe(modified).customization.optic,'micro');
 assert.equal(readGlockRecipe({...modified,model:'glock-g26'}),null);
});


test('S5 gallery parity: secondary uses the primary hero/browser hierarchy, with optional utilities',()=>{
 const primary=readFileSync(new URL('../src/arsenal/gallery-main.ts',import.meta.url),'utf8');
 const secondary=readFileSync(new URL('../src/arsenal/glock-gallery.ts',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/arsenal/arsenal.css',import.meta.url),'utf8');
 assert.ok(primary.includes("className='arsenal-layout'"));
 assert.ok(primary.includes("className='arsenal-hero'"));
 assert.ok(secondary.includes("className='arsenal-layout arsenal-glock-gallery'"));
 assert.ok(secondary.includes('class="arsenal-hero arsenal-glock-feature"'));
 assert.ok(secondary.includes('class="arsenal-hero-media arsenal-glock-hero-visual"'));
 assert.ok(secondary.includes('class="arsenal-hero-copy arsenal-glock-feature-copy"'));
 assert.ok(secondary.includes('class="arsenal-browser arsenal-glock-browser"'));
 assert.ok(secondary.includes('class="arsenal-grid arsenal-glock-cards"'));
 assert.ok(secondary.includes('details class="arsenal-glock-views"'));
 assert.ok(secondary.includes('details class="arsenal-glock-kit"'));
 assert.ok(secondary.includes("section.querySelector('.arsenal-glock-kit')!.append(equipPanel)"));
 assert.ok(css.includes('.arsenal-shell>.arsenal-glock-gallery[hidden]{display:none}'));
 assert.ok(css.includes('.arsenal-glock-gallery>.arsenal-glock-feature'));
});
test('S5 camera parity: primary and Glock pointer drag use the same horizontal sign',()=>{
 const primary=readFileSync(new URL('../src/arsenal/viewport.ts',import.meta.url),'utf8');
 const secondary=readFileSync(new URL('../src/arsenal/glock-viewport.ts',import.meta.url),'utf8');
 assert.match(primary,/this\.yaw-=dx\*\.009/);
 assert.match(secondary,/this\.yaw-=\(event\.clientX-previous\.x\)\*\.009/);
 assert.doesNotMatch(secondary,/this\.yaw\+=\(event\.clientX-previous\.x\)/);
 assert.ok(secondary.includes("this.element.style.touchAction='none'"));
});
test('S5 secondary Workbench follows primary category, stats and apply structure',()=>{
 const primary=readFileSync(new URL('../src/arsenal/workbench-screen.ts',import.meta.url),'utf8');
 const secondary=readFileSync(new URL('../src/arsenal/glock-workbench.ts',import.meta.url),'utf8');
 assert.ok(primary.includes("className='arsenal-wb-stats-head'"));
 assert.ok(secondary.includes("className='arsenal-wb-stats-head'"));
 assert.ok(secondary.includes("className='arsenal-wb-stats-grid glock-wb-stats-grid'"));
 assert.ok(secondary.includes("className='arsenal-wb-screen arsenal-wb-has-apply arsenal-glock-workbench'"));
 assert.ok(secondary.includes("action('MODEL','arsenal-wb-category')"));
 assert.ok(secondary.includes("className='arsenal-wb-option-list glock-wb-options'"));
});
