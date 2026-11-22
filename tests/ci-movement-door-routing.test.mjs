import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {movementDoorSpecs,selectMovementDoorSuites} from '../scripts/verification/ci-specialist-routing.mjs';

const workflow=name=>readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8');
// Frozen original trigger file globs, checked against exported router ownership.
const frozen=[
  {
    "key": "release7",
    "paths": [
      "scripts/audit-r7-squad-execution.mjs",
      "scripts/audit-squad-entry-b.mjs",
      "src/breach-passage.ts",
      "src/breach-door.ts",
      "src/breach-door-leaf-bypass.ts",
      "src/breach-door-pressure-arbitration.ts",
      "src/breach-motor-door.ts",
      "src/breach-motor-collision.ts",
      "src/breach-motor-route.ts",
      "tests/release7-*.test.mjs",
      "src/breach-game.ts",
      "src/breach-entry-lanes.ts",
      "tests/squad-entry-b-*.test.mjs",
      ".github/workflows/release7-critical.yml"
    ]
  },
  {
    "key": "doorD5",
    "paths": [
      "src/breach-door.ts",
      "src/breach-motor-door.ts",
      "src/breach-motor-route.ts",
      "src/breach-motor-collision.ts",
      "src/breach-door-pressure-frame.ts",
      "tests/door-traversal-d5-motor.test.mjs",
      ".github/workflows/door-traversal-d5.yml"
    ]
  },
  {
    "key": "doorD2D3",
    "paths": [
      "src/breach-door-traversal-maneuver.ts",
      "src/breach-door-traversal-episode.ts",
      "src/breach-door-pressure-frame.ts",
      "src/breach-door.ts",
      "src/breach-motor-collision.ts",
      "src/breach-motor-route.ts",
      "tests/door-traversal-d2.test.mjs",
      "tests/door-traversal-d3.test.mjs",
      ".github/workflows/door-traversal-d2-d3.yml"
    ]
  },
  {
    "key": "passageQ5",
    "paths": [
      "src/breach-door-test-cases.ts",
      "src/breach-door.ts",
      "src/breach-door-kick-cover.ts",
      "src/breach-order-door.ts",
      "src/breach-squeeze-gate.ts",
      "src/breach-motor-collision.ts",
      "src/worldgen/doorway-clutter-repair.ts",
      "src/breach-2d-route-overlays.ts",
      "src/breach-2d-projected-overlays.ts",
      "src/ui/passage-rank-badges.ts",
      "src/breach-passage-visual-ranks.ts",
      "tests/passage-q5-live-blockers.test.mjs",
      "src/door-range-q5-benchmark.ts",
      "src/door-test-range-main.ts",
      "door-test-range.html",
      "tests/passage-q5-approaches.test.mjs",
      "scripts/audit-passage-q5.mjs",
      ".github/workflows/passage-q5-matrix.yml"
    ]
  },
  {
    "key": "performanceP28",
    "paths": [
      "src/breach-navigation.ts",
      "src/breach-world-context.ts",
      "src/breach-motor-collision.ts",
      "src/breach-actor-motor.ts",
      "tests/performance-p2-8-sweep-broadphase.test.mjs",
      "tests/performance-p2-8-cover-los.test.mjs",
      ".github/workflows/performance-p2-8-critical.yml"
    ]
  },
  {
    "key": "recovery17e",
    "paths": [
      "src/breach-recovery-proposal-gate.ts",
      "src/breach-cold-route-cache.ts",
      "src/breach-motor-collision.ts",
      "src/breach-motor-route.ts",
      "src/breach-execution-state.ts",
      "src/breach-physical-leaf-rejoin.ts",
      "src/breach-d336-stale-open-leaf.ts",
      "src/breach-d337-entry-service-landing.ts",
      "scripts/report-d3-15b4-blind22.mjs",
      "scripts/audit-r7-squad-execution.mjs",
      "tests/release-d3-17e-recovery-accounting.test.mjs",
      ".github/workflows/d3-17e-recovery.yml",
      "scripts/verification/ci-a8-physical-acceptance.mjs",
      "scripts/verification/ci-lock-aware-physical-acceptance.mjs",
      "scripts/verification/ci-physical-cohort-provenance.mjs",
      "scripts/verification/ci-d3-physical-truth.mjs",
      "tests/ci-a8-physical-acceptance.test.mjs"
    ]
  },
  {
    "key": "physical25",
    "paths": [
      "src/breach-order-wait.ts",
      "src/breach-motor-route.ts",
      "src/breach-d325-escape-join.ts",
      "src/breach-d336-stale-open-leaf.ts",
      "src/breach-d337-entry-service-landing.ts",
      "scripts/audit-r7-squad-execution.mjs",
      "tests/release-d3-25*.test.mjs",
      ".github/workflows/d3-25-physical-acceptance.yml",
      "scripts/verification/ci-a8-physical-acceptance.mjs",
      "scripts/verification/ci-lock-aware-physical-acceptance.mjs",
      "scripts/verification/ci-physical-cohort-provenance.mjs",
      "scripts/verification/ci-d3-physical-truth.mjs",
      "tests/ci-a8-physical-acceptance.test.mjs"
    ]
  },
  {
    "key": "coordinated15",
    "paths": [
      "src/breach-motor-door.ts",
      "src/breach-order-movement.ts",
      "src/breach-entry-coordination.ts",
      "src/breach-order-wait.ts",
      "src/breach-motor-collision.ts",
      "src/breach-stack-micro-corner.ts",
      "tests/release-d3-15a2-explicit-door-clock.test.mjs",
      ".github/workflows/d3-15-coordinated-release.yml",
      "src/breach-actor-motor.ts",
      "src/breach-locomotion-clearance.ts",
      "src/breach-motor-route.ts",
      "src/breach-generated-entry-stillness.ts",
      "src/breach-static-cover-release.ts",
      "tests/release-d3-40-townhouse-porch-cover-release.test.mjs",
      "scripts/audit-r7-squad-execution.mjs",
      "scripts/verification/ci-a8-physical-acceptance.mjs",
      "scripts/verification/ci-physical-cohort-provenance.mjs",
      "scripts/verification/ci-lock-aware-physical-acceptance.mjs"
    ]
  }
];
const keys=frozen.map(x=>x.key);
test('A7a exact legacy PR path ownership preserved for all live physical cohorts',()=>{
 assert.deepEqual(movementDoorSpecs.map(({key,paths})=>({key,paths})),frozen);
 for(const {key,paths} of frozen)for(const path of paths)
  assert.equal(selectMovementDoorSuites([path])[key],true,path+' '+key);
});
test('A7a unrelated documents, replay and weapon art do not run physical audits',()=>{
 for(const paths of [[],['docs/notes.md'],['src/weapons/geometry/glock-family-silhouettes.ts'],
  ['src/breach-replay-camera-controller.ts']])
  assert.ok(Object.values(selectMovementDoorSuites(paths)).every(x=>x===false),paths.join(','));
});
test('A7a CI, router and contract edits fail closed; input union is deterministic',()=>{
 for(const path of ['.github/workflows/ci.yml','.github/workflows/movement-door-acceptance.yml',
  'scripts/verification/ci-specialist-routing.mjs','tests/ci-movement-door-routing.test.mjs'])
  assert.deepEqual(Object.entries(selectMovementDoorSuites([path])).filter(([,yes])=>yes).map(([key])=>key),keys);
 const paths=['src/breach-motor-collision.ts','src/breach-motor-collision.ts',
  'tests/door-traversal-d2.test.mjs'];
 assert.deepEqual(selectMovementDoorSuites(paths),selectMovementDoorSuites([...paths].reverse()));
});
test('A7a one nested main PR dispatch, preserving all original suites',()=>{
 const ci=workflow('ci.yml'),router=workflow('movement-door-acceptance.yml');
 assert.match(ci,/^  movement-door-acceptance:$/m);
 assert.match(ci,/needs.specialist-routing.outputs.movementDoorAny/);
 assert.match(ci,/needs.specialist-routing.outputs.movementDoorJSON/);
 assert.match(ci,/uses: \.\/\.github\/workflows\/movement-door-acceptance\.yml/);
 assert.equal((ci.match(/uses: \.\/\.github\/workflows\/movement-door-acceptance\.yml/g)||[]).length,1);
 assert.match(router,/^  workflow_call:$/m);
 assert.match(router,/^  workflow_dispatch:$/m);
 assert.doesNotMatch(router,/^  pull_request:$/m);
 for(const {key} of frozen)assert.ok(router.includes('fromJSON(inputs.lanes).'+key),key);
});
test('A7a original feature push/manual and physical measurements cannot disappear',()=>{
 const r7=workflow('release7-critical.yml'),d5=workflow('door-traversal-d5.yml'),
  d2=workflow('door-traversal-d2-d3.yml');
 for(const source of [r7,d5,d2]){
  assert.match(source,/^  workflow_call:$/m);
  assert.match(source,/^  workflow_dispatch:$/m);
  assert.doesNotMatch(source,/^  pull_request:$/m);
  assert.match(source,/npm run build/);
 }
 for(const marker of ['feature/release7-squad-reliability-','audit-r7-squad-execution.mjs 3 600',
  'audit-r7-squad-execution.mjs 11 900','audit-squad-entry-b.mjs'])assert.ok(r7.includes(marker),marker);
 for(const marker of ['feature/door-traversal-d5-','audit-door-traversal-baseline.mjs 4 1800',
  'tests/door-traversal-d5-motor.test.mjs'])assert.ok(d5.includes(marker),marker);
 for(const marker of ['feature/door-traversal-d2-d3-','audit-door-traversal-baseline.mjs 4 900',
  'audit-door-traversal-baseline.mjs 4 1800','tests/doorway-right-of-way-session.test.mjs'])
  assert.ok(d2.includes(marker),marker);
});

test('A7c preserve strict passage motor geometry and real performance broadphase',()=>{
 const router=workflow('movement-door-acceptance.yml');
 const q5=workflow('passage-q5-matrix.yml'),perf=workflow('performance-p2-8-critical.yml');
 for(const [key,file,content] of [
  ['passageQ5','passage-q5-matrix.yml',q5],
  ['performanceP28','performance-p2-8-critical.yml',perf]]){
  assert.match(content,/^  workflow_call:$/m);
  assert.match(content,/^  workflow_dispatch:$/m);
  assert.doesNotMatch(content,/^  pull_request:$/m);
  assert.ok(router.includes('fromJSON(inputs.lanes).'+key));
  assert.ok(router.includes('uses: ./.github/workflows/'+file));
 }
 for(const needle of ['feature/passage-q5-','audit-passage-q5.mjs --extended --strict',
  'audit-passage-q5.mjs --release-a --extended --strict',
  'tests/passage-q5-live-blockers.test.mjs','tests/passage-q5-approaches.test.mjs'])
  assert.ok(q5.includes(needle),needle);
 for(const needle of ['tests/performance-p2-8-sweep-broadphase.test.mjs',
  'tests/performance-p2-8-cover-los.test.mjs','tests/performance-p2-7-live-routing.test.mjs',
  "retreat belongs|idle doorway occupancy|single furniture-side obstruction",
  'npm run check && npx vite build'])
  assert.ok(perf.includes(needle),needle);
});

test('A8b preserved D3.17E and D3.25 distinct 60Hz cohorts are nested, not duplicated PR runs',()=>{
 const ci=workflow('ci.yml'),router=workflow('movement-door-acceptance.yml');
 assert.equal((ci.match(/uses: \.\/\.github\/workflows\/movement-door-acceptance\.yml/g)||[]).length,1);
 for(const [key,file,required] of [
  ['recovery17e','d3-17e-recovery.yml',[
   '--d315b4-blind22','11 2700','22 2700',
   '--route-transitions','--d329-cancellation-door-witness',
   'ci-a8-physical-acceptance.mjs','historical11','frozen22',
   'tests/release-d3-17e-recovery-accounting.test.mjs']],
  ['physical25','d3-25-physical-acceptance.yml',[
   '--d318-fresh22','--d315b4-blind22','11 2700','22 2700',
   '--d329-cancellation-door-witness','--route-transitions',
   'ci-a8-physical-acceptance.mjs','historical11','fresh22','frozen22',
   'tests/release-d3-25f-cold-swept-entry-escape.test.mjs']]
 ]){
  const source=workflow(file);
  assert.match(source,/^  workflow_call:$/m,file+' must be reusable');
  assert.match(source,/^  workflow_dispatch:$/m,file+' must be manually runnable');
  assert.doesNotMatch(source,/^  pull_request:$/m,file+' must not duplicate primary CI');
  assert.ok(router.includes('fromJSON(inputs.lanes).'+key),key+' missing selection');
  assert.ok(router.includes('uses: ./.github/workflows/'+file),file+' missing caller');
  for(const item of required)
   assert.ok(source.includes(item),file+' omitted original cohort '+item);
 }
 assert.match(workflow('d3-25-physical-acceptance.yml'),
  /branches: \[feature\/d3-25-entry-stall-witness-20261118\]/,
  'the original feature-specific push remains intentionally available');
});
test('A8b physical-proof source edits and all original motor file globs select exact retained lanes',()=>{
 for(const path of [
  'scripts/verification/ci-a8-physical-acceptance.mjs',
  'scripts/verification/ci-physical-cohort-provenance.mjs',
  'scripts/verification/ci-lock-aware-physical-acceptance.mjs',
  'scripts/verification/ci-d3-physical-truth.mjs',
  'scripts/audit-r7-squad-execution.mjs',
  'src/breach-motor-route.ts',
  'src/breach-d337-entry-service-landing.ts',
  'tests/ci-a8-physical-acceptance.test.mjs']){
  const selected=selectMovementDoorSuites([path]);
  assert.equal(selected.recovery17e,true,path+' missing recovery');
  assert.equal(selected.physical25,true,path+' missing fresh/historical/frozen');
 }
 for(const path of ['docs/deployment-notes.md',
  'src/weapons/geometry/glock-family-silhouettes.ts']){
  const selected=selectMovementDoorSuites([path]);
  assert.equal(selected.recovery17e,false,'unrelated file triggers recovered cohorts');
  assert.equal(selected.physical25,false,'unrelated file triggers fresh cohort');
 }
});
test('A8b independent cohort jobs cannot cancel each other through caller concurrency',()=>{
 const a=workflow('d3-17e-recovery.yml');
 const b=workflow('d3-25-physical-acceptance.yml');
 const g1=a.split('\n').find(x=>x.startsWith('  group: '));
 const g2=b.split('\n').find(x=>x.startsWith('  group: '));
 assert.match(g1,/d317e-recovery-/);
 assert.match(g2,/d325-physical-/);
 assert.notEqual(g1,g2);
 assert.doesNotMatch(g1,/github\.workflow/);
 assert.doesNotMatch(g2,/github\.workflow/);
});
test('A8d D3.15 remains an actual three-fixture 60Hz original-GO 4/4 release gate',()=>{
 const workflowText=workflow('d3-15-coordinated-release.yml'),
  router=workflow('movement-door-acceptance.yml');
 assert.match(workflowText,/^  workflow_call:$/m);
 assert.match(workflowText,/^  workflow_dispatch:$/m);
 assert.doesNotMatch(workflowText,/^  pull_request:$/m,
  'no second independently queued PR physical audit');
 assert.ok(router.includes('fromJSON(inputs.lanes).coordinated15'));
 assert.ok(router.includes('uses: ./.github/workflows/d3-15-coordinated-release.yml'));
 assert.ok(router.includes('"coordinated15":true'),
  'manual all-suite dispatcher must retain D3.15');
 for(const needle of [
  '9473230','9568385','9492261',
  '--site-index=7','--site-index=1','--site-index=8',
  '11 2700','m.arrivals!==4','x.remainingOrders',
  'm.crossed.some(x=>x===null)',
  'vale:stack-micro-corner',
  'physicsStepViolations','corruptedPlans',
  'historical11','ci-a8-physical-acceptance.mjs',
  '--d329-cancellation-door-witness'
 ])assert.ok(workflowText.includes(needle),
   'D3.15 missing original physical proof '+needle);
 assert.match(workflowText,/d315-coordinated-/);
 assert.doesNotMatch(workflowText,/group: \$\{\{ github.workflow \}\}/);
});
test('A8d actual entry/door/pinch code selects D3.15; unrelated docs do not',()=>{
 for(const path of [
  'src/breach-motor-door.ts','src/breach-order-movement.ts',
  'src/breach-entry-coordination.ts','src/breach-order-wait.ts',
  'src/breach-motor-collision.ts','src/breach-stack-micro-corner.ts',
  'src/breach-actor-motor.ts','src/breach-locomotion-clearance.ts',
  'src/breach-motor-route.ts','src/breach-generated-entry-stillness.ts',
  'src/breach-static-cover-release.ts',
  'tests/release-d3-15a2-explicit-door-clock.test.mjs',
  'tests/release-d3-40-townhouse-porch-cover-release.test.mjs',
  'scripts/audit-r7-squad-execution.mjs',
  'scripts/verification/ci-a8-physical-acceptance.mjs',
  '.github/workflows/d3-15-coordinated-release.yml']){
  const selected=selectMovementDoorSuites([path]);
  assert.equal(selected.coordinated15,true,'D3.15 not selected by '+path);
 }
 for(const path of ['docs/changelog.md',
  'src/weapons/geometry/glock-family-silhouettes.ts'])
  assert.equal(selectMovementDoorSuites([path]).coordinated15,false,
   'unrelated edit must not launch D3.15 physical cohort: '+path);
});
