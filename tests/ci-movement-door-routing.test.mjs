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
      "scripts/report-d3-15b4-blind22.mjs",
      "tests/release-d3-17e-recovery-accounting.test.mjs",
      ".github/workflows/d3-17e-recovery.yml"
    ]
  },
  {
    "key": "physical25",
    "paths": [
      "src/breach-order-wait.ts",
      "src/breach-motor-route.ts",
      "src/breach-d325-escape-join.ts",
      "tests/release-d3-25*.test.mjs",
      ".github/workflows/d3-25-physical-acceptance.yml"
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
      ".github/workflows/d3-15-coordinated-release.yml"
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

test('A7b preserve independently executed live/frozen body cohorts and strict floors',()=>{
 const router=workflow('movement-door-acceptance.yml');
 const runs=[
  ['recovery17e','d3-17e-recovery.yml',['--d315b4-blind22','11 2700','22 2700','physicalArrivals<140','physicsStepViolations']],
  ['physical25','d3-25-physical-acceptance.yml',['--d318-fresh22','--d315b4-blind22','physicalArrivals<158','physicalCompletedFour<34']],
  ['coordinated15','d3-15-coordinated-release.yml',['m.arrivals!==4','physicalArrivals<80','--site-index=8']]
 ];
 for(const [key,file,evidence] of runs){
  const source=workflow(file);
  assert.match(source,/^  workflow_call:$/m);
  assert.match(source,/^  workflow_dispatch:$/m);
  assert.doesNotMatch(source,/^  pull_request:$/m);
  assert.ok(router.includes('fromJSON(inputs.lanes).'+key),key);
  assert.ok(router.includes('uses: ./.github/workflows/'+file),file);
  for(const marker of evidence)assert.ok(source.includes(marker),file+' '+marker);
 }
 assert.match(workflow('d3-25-physical-acceptance.yml'),/feature\/d3-25-entry-stall-witness-20261118/);
});

test('A7b nested historical cohorts have distinct non-cancelling concurrency groups',()=>{
 const groups=[
  ['d3-17e-recovery.yml','d317e-recovery-'],
  ['d3-15-coordinated-release.yml','d315-coordinated-'],
  ['d3-25-physical-acceptance.yml','d325-physical-']
 ];
 const seen=new Set();
 for(const [file,prefix] of groups){
  const source=workflow(file);
  const line=source.split('\n').find(x=>x.startsWith('  group: '));
  assert.ok(line?.startsWith('  group: '+prefix),file);
  assert.ok(!line.includes('github.workflow'),file+' must not inherit caller workflow name');
  assert.ok(!seen.has(line),'Shared concurrency key between physical audits: '+file);
  assert.match(source,/cancel-in-progress:/);
  seen.add(line);
 }
});
