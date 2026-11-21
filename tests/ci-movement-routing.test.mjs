import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectMovementSuites} from '../scripts/verification/ci-specialist-routing.mjs';

const workflow=name=>readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8');
const selected=paths=>Object.entries(selectMovementSuites(paths))
 .filter(([,enabled])=>enabled).map(([name])=>name).sort();

test('A3 documentation and unrelated weapons edits do not run D3 physical suites',()=>{
 for(const files of [[],['docs/notes.md'],
  ['src/weapons/geometry/beretta-m9-silhouettes.ts']])
  assert.deepEqual(selected(files),[]);
});
test('A3 all D3 movement source variants get modern D3.30 + frozen22 physical truth',()=>{
 for(const file of ['src/breach-route-transition.ts','src/breach-motor-collision.ts',
  'src/breach-d317c-micro-departure.ts','src/breach-door-traversal-maneuver.ts'])
  assert.deepEqual(selected([file]),['movementRecovery','movementRelease'],file);
});
test('A3 legacy workflow and test changes cannot escape current D3 release ownership',()=>{
 for(const file of [
  '.github/workflows/d3-14d2-retail-recovery.yml',
  '.github/workflows/d3-17c-departure.yml',
  '.github/workflows/d3-17d-door-join.yml',
  '.github/workflows/d3-main-release-checkpoint.yml',
  'tests/release-d3-17d-door-route-join.test.mjs',
  'scripts/lib/d3-30-physical-gate.mjs',
  'scripts/verification/ci-d3-physical-truth.mjs',
  'tests/ci-d3-physical-truth.test.mjs'
 ])assert.ok(selected([file]).includes('movementRelease'),file);
 assert.deepEqual(selected(['.github/workflows/d3-18-physical-recovery.yml']),
  ['movementRecovery','movementRelease']);
});
test('A3 exact path selection deterministic and deduplicated',()=>{
 const files=['src/breach-route-transition.ts','tests/release-d3-17c-physical-departure.test.mjs',
  'src/breach-route-transition.ts'];
 assert.deepEqual(selectMovementSuites(files),selectMovementSuites([...files].reverse()));
});
test('A3 only current D3 physical truth and focused recovery called on main PR',()=>{
 const ci=workflow('ci.yml');
 for(const [job,output,filename] of [
  ['d3-recovery-critical','movementRecovery','d3-18-physical-recovery.yml'],
  ['d3-main-physical-checkpoint','movementRelease','d3-main-release-checkpoint.yml']
 ]){
  assert.ok(ci.includes('  '+job+':'),job);
  assert.ok(ci.includes('needs.specialist-routing.outputs.'+output));
  assert.ok(ci.includes('uses: ./.github/workflows/'+filename));
  assert.ok(ci.includes('steps.owners.outputs.'+output));
 }
 for(const old of ['d3-14d2-retail-recovery.yml','d3-17c-departure.yml',
  'd3-17d-door-join.yml']){
  assert.ok(!ci.includes('uses: ./.github/workflows/'+old),old);
  const specialist=workflow(old);
  assert.match(specialist,/^  workflow_call:$/m);
  assert.match(specialist,/^  workflow_dispatch:$/m);
  assert.match(specialist,/branches-ignore: \[main\]/);
 }
});
test('A3 modern main release preserves historic focused tests and real motor audits',()=>{
 const main=workflow('d3-main-release-checkpoint.yml');
 for(const path of [
  'tests/release-d3-14d2-retail-rehearsal.test.mjs',
  'tests/release-d3-17c-physical-departure.test.mjs',
  'tests/release-d3-17d-door-route-join.test.mjs',
  'tests/ci-d3-physical-truth.test.mjs',
  'scripts/verify-d3-30-mainline.mjs',
  'scripts/verification/ci-d3-physical-truth.mjs',
  '--d315b4-blind22','--d329-cancellation-door-witness',
  '--site-index=9','--site-index=3',
  'd3-main-release-45s'
 ])assert.ok(main.includes(path),path);
 const d318=workflow('d3-18-physical-recovery.yml');
 assert.match(d318,/^  workflow_call:$/m);
 assert.match(d318,/^  workflow_dispatch:$/m);
});
