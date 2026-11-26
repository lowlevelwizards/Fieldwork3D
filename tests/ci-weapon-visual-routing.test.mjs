import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectWeaponVisualSuites} from '../scripts/verification/ci-specialist-routing.mjs';

const wf=name=>readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8');
const ci=wf('ci.yml'),m30=wf('arsenal-m30.yml'),glock=wf('glock-family-art.yml');
const route=files=>selectWeaponVisualSuites(files);

test('A4 ordinary docs, general movement, and unrelated gameplay do not launch weapon visual smoke',()=>{
 for(const path of ['docs/readme.md','src/breach-motor-collision.ts',
  'tests/doorway-right-of-way-session.test.mjs','src/worldgen/public-street-layout.ts']){
  assert.deepEqual(route([path]),{arsenalM30:false,glockArt:false},path);
 }
});
test('A4 all original M30 production PR trigger families remain covered',()=>{
 const oldPaths=[
  'src/breach-weapon-geometry.ts','src/weapons/geometry/beretta-m9-silhouettes.ts',
  'src/arsenal/gallery-main.ts','scripts/audit-weapon-production-m30.mjs',
  'src/arsenal-m30c3-modular-capture.ts','arsenal-m30c3-modular-capture.html',
  'scripts/smoke-arsenal-m30c3-modular-visual.mjs',
  'scripts/smoke-arsenal-m30c4-runtime-visual.mjs',
  'src/arsenal-m30c5-factory-capture.ts','arsenal-m30c5-factory-capture.html',
  'scripts/smoke-arsenal-m30c5-candidate-visual.mjs',
  'scripts/smoke-arsenal-m30c5-runtime-visual.mjs',
  'tests/arsenal-m30c4-factory-runtime.test.mjs',
  'tests/arsenal-m30c5-factory-runtime-switching.test.mjs',
  'tests/arsenal-m30-modular-visual-contract.test.mjs',
  'tests/weapon-r870-p08-polish.test.mjs',
  'tests/weapon-r870-p09-identity.test.mjs',
  'tests/weapon-r870-p12-rear-family.test.mjs',
  'tests/weapon-r870-p13-proportions.test.mjs',
  'tests/weapon-r870-p14-front.test.mjs','tests/weapon-r870-p15-mcs.test.mjs',
  'tests/weapon-r870-p16-pistol-grip.test.mjs',
  'src/arsenal-r870-p07-capture.ts','arsenal-r870-p07-capture.html',
  'scripts/smoke-arsenal-r870-p07-visual.mjs',
  '.github/workflows/arsenal-m30.yml'
 ];
 for(const file of oldPaths)assert.equal(route([file]).arsenalM30,true,file);
});
test('A4 exact original Glock gallery and Beretta file paths remain covered',()=>{
 const oldPaths=[
  'src/weapons/geometry/glock-family-silhouettes.ts',
  'src/arsenal/glock-gallery.ts','src/arsenal/gallery-main.ts',
  'src/arsenal/preview-job-queue.ts','src/arsenal/gallery-browser-controls.ts',
  'src/arsenal/gallery-chrome.ts',
  'tests/consolidation-p11-arsenal-chrome.test.mjs',
  'tests/consolidation-p10-arsenal-controls.test.mjs',
  'tests/consolidation-p9-arsenal-preview.test.mjs',
  'tests/performance-p3-preview-hotpaths.test.mjs',
  'scripts/smoke-consolidation-p9-arsenal.mjs',
  'src/arsenal/arsenal.css','tests/weapon-glock-family-art.test.mjs',
  'src/weapons/geometry/beretta-m9-silhouettes.ts',
  'src/weapons/geometry/sidearm-preview.ts',
  'src/arsenal/m9-inspector.ts','tests/weapon-beretta-m9-art.test.mjs',
  'tests/secondary-s1-s3-foundation.test.mjs','src/secondary-equipment.ts',
  'src/equipment-loadouts.ts','.github/workflows/glock-family-art.yml'
 ];
 for(const file of oldPaths)assert.equal(route([file]).glockArt,true,file);
});
test('A4 overlap and infrastructure edits execute both visual domains without duplicate owners',()=>{
 assert.deepEqual(route(['src/weapons/geometry/beretta-m9-silhouettes.ts']),
  {arsenalM30:true,glockArt:true});
 for(const f of ['package.json','package-lock.json','vite.config.ts','tsconfig.json',
  '.github/workflows/ci.yml','scripts/verification/ci-specialist-routing.mjs',
  'tests/ci-weapon-visual-routing.test.mjs']){
  assert.deepEqual(route([f]),{arsenalM30:true,glockArt:true},f);
 }
 const paths=['src/arsenal/gallery-main.ts','src/arsenal/gallery-main.ts'];
 assert.deepEqual(route(paths),route([...paths].reverse()));
});
test('A4 only primary CI launches main PR specialist visual verification',()=>{
 assert.match(m30,/^on:\n  workflow_call:\n  workflow_dispatch:/m);
 assert.doesNotMatch(m30.split('\njobs:')[0],/^  pull_request:/m);
 assert.match(glock,/^  workflow_call:$/m);
 assert.match(glock,/^  workflow_dispatch:$/m);
 assert.match(glock,/branches-ignore: \[main\]/);
 assert.match(glock,/group: glock-family-art-/);
 for(const [job,name,output] of [
  ['arsenal-m30-visual','arsenal-m30.yml','arsenalM30'],
  ['glock-family-visual','glock-family-art.yml','glockArt']
 ]){
  assert.ok(ci.includes('  '+job+':'),job);
  assert.ok(ci.includes('uses: ./.github/workflows/'+name));
  assert.ok(ci.includes('needs.specialist-routing.outputs.'+output));
  assert.ok(ci.includes('steps.owners.outputs.'+output));
 }
});
test('A4 production geometry, real WebGL and evidence capture are retained unchanged',()=>{
 for(const file of [
  'tests/arsenal-m30-weapon-quality-audit.test.mjs',
  'scripts/audit-weapon-production-m30.mjs',
  'smoke-arsenal-m30c3-modular-visual.mjs',
  'smoke-arsenal-m30c4-runtime-visual.mjs',
  'smoke-arsenal-m30c5-candidate-visual.mjs',
  'smoke-arsenal-m30c5-runtime-visual.mjs',
  'smoke-arsenal-r870-p07-visual.mjs',
  'arsenal-m30-physical-visual-smoke'
 ]) assert.ok(m30.includes(file),file);
 for(const file of [
  'tests/weapon-glock-family-art.test.mjs','tests/weapon-beretta-m9-art.test.mjs',
  'smoke-consolidation-p9-arsenal.mjs','beretta-m9-art-review'
 ]) assert.ok(glock.includes(file),file);
});
