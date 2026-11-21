import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectSpecialists} from '../scripts/verification/ci-specialist-routing.mjs';

const wf=name=>readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8');
const ci=wf('ci.yml');
const owners=['loadout','physical','arsenal'];

test('no changed files or documentation-only PRs do not dispatch unrelated specialist suites',()=>{
 for(const files of [[],['docs/readme.md'],['docs/dispatch-d2-content-policy-scope.md']]){
  assert.deepEqual(selectSpecialists(files).selected,
   {loadout:false,physical:false,arsenal:false});
 }
});

test('each authored source/test owner keeps its original critical suite',()=>{
 const cases=[
  ['src/loadout-field-inventory.ts','loadout'],
  ['src/breach-equipment-pose.ts','physical'],
  ['src/arsenal/workbench-screen.ts','arsenal'],
  ['src/weapons/geometry/beretta-m9-silhouettes.ts','arsenal'],
  ['tests/f6-wedge-handoff.test.mjs','physical'],
  ['tests/loadout-f5-campaign-squad-refill.test.mjs','loadout'],
  ['tests/arsenal-m2-physical-mount-slots.test.mjs','arsenal']
 ];
 for(const [path,expected] of cases)
  assert.equal(selectSpecialists([path]).selected[expected],true,path);
});

test('unknown source/test infrastructure and shared config changes fail closed',()=>{
 for(const path of ['src/unknown-future-system.ts','tests/unknown-test.test.mjs',
  'scripts/verification/new-selector.mjs','package.json','tsconfig.json',
  '.github/workflows/ci.yml','scripts/verification/ci-specialist-routing.mjs']){
  const selected=selectSpecialists([path]).selected;
  assert.deepEqual(owners.filter(owner=>selected[owner]),owners,path);
 }
});

test('selector is stable, deduplicates input, and unions domain owners',()=>{
 const files=['src/weapons/geometry/beretta-m9-silhouettes.ts',
  'src/loadout-field-inventory.ts','src/loadout-field-inventory.ts'];
 assert.deepEqual(selectSpecialists(files),selectSpecialists([...files].reverse()));
 const selected=selectSpecialists(files).selected;
 assert.equal(selected.loadout,true);
 assert.equal(selected.arsenal,true);
});

test('primary CI owns three reusable specialist jobs and detection has outputs',()=>{
 assert.match(ci,/^  specialist-routing:$/m);
 for(const [job,filename] of [
  ['loadout-domain','loadout-prep-l2-critical.yml'],
  ['physical-equipment-domain','f6-physical-equipment-critical.yml'],
  ['arsenal-mount-domain','arsenal-m2-mount-inventory.yml']]){
  assert.match(ci,new RegExp('^  '+job+':$','m'));
  assert.ok(ci.includes('uses: ./.github/workflows/'+filename));
  assert.match(wf(filename),/^  workflow_call:$/m);
  assert.match(wf(filename),/^  workflow_dispatch:$/m);
 }
 assert.ok(ci.includes('ci-specialist-routing.mjs --github-output'));
 assert.ok(ci.includes('fetch-depth: 0'));
});

test('legacy specialist workflows keep full test commands, WebGL artifacts and manual acceptance',()=>{
 const loadout=wf('loadout-prep-l2-critical.yml'),
  physical=wf('f6-physical-equipment-critical.yml'),
  arsenal=wf('arsenal-m2-mount-inventory.yml');
 assert.ok(loadout.includes('tests/equipment-mission-field-reconciliation.test.mjs'));
 assert.ok(loadout.includes('feature/loadout-l212-f2-field-consumption-20261119'));
 assert.ok(physical.includes('tests/f6-wedge-handoff.test.mjs'));
 assert.ok(arsenal.includes('smoke-arsenal-m25-visual.mjs'));
 assert.ok(arsenal.includes('audit-pages-release-checkpoint.mjs'));
 assert.ok(arsenal.includes('arsenal-m25-rail-grip-light-visual-acceptance'));
 for(const file of [loadout,physical,arsenal])assert.ok(file.includes('workflow_dispatch:'));
});
