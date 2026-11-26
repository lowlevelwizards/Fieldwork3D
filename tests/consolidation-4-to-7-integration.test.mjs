import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
const workflow=path=>readFileSync(new URL('../.github/workflows/'+path,import.meta.url),'utf8');

test('consolidation 4-7 has one library boundary per recipe and no second equipment authority',()=>{
 const primary=src('arsenal/saved-builds.ts');
 const secondary=src('arsenal/glock-saved-builds.ts');
 const common=src('arsenal/saved-build-library-common.ts');
 assert.match(primary,/parseSavedBuildEntries\(raw,'arsenal-'/);
 assert.match(secondary,/parseSavedBuildEntries\(raw,'glock-build-'/);
 assert.match(primary,/fieldwork3d\.arsenal-recipes\.v1/);
 assert.match(secondary,/fieldwork3d\.arsenal-secondary-recipes\.v1/);
 assert.match(common,/writeStoredSavedBuilds/);
 assert.doesNotMatch(common,/equipRoster|equipCampaign|loadedRounds|magazineSerial/);
});

test('legacy named mobile workflows use one shared browser acceptance',()=>{
 for(const name of ['loadout-ux-r1-critical.yml',
  'visual-armory-v1-critical.yml','visual-armory-v2-critical.yml']){
  const text=workflow(name);
  assert.match(text,/uses: \.\/\.github\/actions\/outfitter-mobile-smoke/);
 }
});

test('Campaign and Quick Play reuse the DOM factory without re-owning gear',()=>{
 const campaign=src('campaign-ui.ts');
 const quick=src('ui/quick-play-configurator.ts');
 const gallery=src('ui/campaign-outfitter-gallery.ts');
 assert.match(campaign,/uiNode as node,uiButton as button/);
 assert.match(quick,/uiNode as node,uiButton as command/);
 assert.match(gallery,/uiNode as el,uiButton as action/);
 assert.match(gallery,/OutfitterChoiceSource/);
 assert.match(quick,/catalogOutfitterSources\(selected\.loadout,selected\.weaponConfiguration\)/);
});
