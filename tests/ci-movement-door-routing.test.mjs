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
