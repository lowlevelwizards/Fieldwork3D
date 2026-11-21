import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectMovementSuites} from '../scripts/verification/ci-specialist-routing.mjs';

const source=name=>readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8');
const keys=['movementRetail','movementDeparture','movementJoin','movementRecovery','movementRelease'];
const on=paths=>Object.entries(selectMovementSuites(paths)).filter(([,v])=>v).map(([key])=>key).sort();

test('A3 no-source and unrelated art edits schedule no D3 physical workflows',()=>{
 for(const files of [[],['docs/notes.md'],['src/weapons/geometry/beretta-m9-silhouettes.ts']]){
  assert.deepEqual(on(files),[],files.join(','));
 }
});
test('A3 exact old D3 path ownership preserved on source and test edits',()=>{
 assert.deepEqual(on(['src/breach-route-transition.ts']),[...keys].sort());
 assert.deepEqual(on(['src/breach-motor-collision.ts']),
  ['movementDeparture','movementRecovery','movementRelease'].sort());
 assert.deepEqual(on(['src/breach-door-traversal-maneuver.ts']),
  ['movementRetail','movementJoin','movementRecovery','movementRelease'].sort());
 assert.deepEqual(on(['src/breach-retail-rehearsal-recovery.ts']),
  ['movementRetail','movementRecovery','movementRelease'].sort());
 assert.deepEqual(on(['tests/release-d3-17c-physical-departure.test.mjs']),
  ['movementDeparture','movementRelease'].sort());
 assert.deepEqual(on(['tests/release-d3-18-physical-recovery.test.mjs']),
  ['movementRecovery','movementRelease'].sort());
 assert.deepEqual(on(['scripts/audit-r7-squad-execution.mjs']),['movementRelease']);
 assert.deepEqual(on(['.github/workflows/d3-17d-door-join.yml']),['movementJoin']);
});
test('A3 D3 path selection deterministic regardless of input order',()=>{
 const paths=['src/breach-route-transition.ts','tests/release-d3-17d-door-route-join.test.mjs','src/breach-route-transition.ts'];
 assert.deepEqual(selectMovementSuites(paths),selectMovementSuites([...paths].reverse()));
});
test('A3 CI callers keep all five physical D3 verification lanes',()=>{
 const ci=source('ci.yml');
 for(const [name,job,filename] of [
  ['movementRetail','d3-retail-physical','d3-14d2-retail-recovery.yml'],
  ['movementDeparture','d3-departure-physical','d3-17c-departure.yml'],
  ['movementJoin','d3-door-join-physical','d3-17d-door-join.yml'],
  ['movementRecovery','d3-recovery-critical','d3-18-physical-recovery.yml'],
  ['movementRelease','d3-main-physical-checkpoint','d3-main-release-checkpoint.yml']
 ]){
  assert.ok(ci.includes(job+':'));
  assert.ok(ci.includes('uses: ./.github/workflows/'+filename));
  assert.ok(ci.includes('needs.specialist-routing.outputs.'+name));
  assert.ok(ci.includes('steps.owners.outputs.'+name));
  assert.equal((ci.match(new RegExp('uses: \\.\\/\\.github\\/workflows\\/'+filename.replaceAll('.','\\.'),'g'))||[]).length,1);
  const yaml=source(filename);
  assert.match(yaml,/^  workflow_call:$/m);
  assert.match(yaml,/^  workflow_dispatch:$/m);
  const trigger=yaml.slice(0,yaml.indexOf('\njobs:'));
  assert.doesNotMatch(trigger,/branches: \[main\]/);
  if(['d3-14d2-retail-recovery.yml','d3-17c-departure.yml','d3-17d-door-join.yml'].includes(filename))
   assert.match(trigger,/branches-ignore: \[main\]/);
  else assert.doesNotMatch(trigger,/  pull_request:/);
 }
});
test('A3 manual physical cohorts and exact release evidence remain available',()=>{
 assert.match(source('d3-17c-departure.yml'),/frozen-cohorts:/);
 assert.match(source('d3-17d-door-join.yml'),/physical-cohort:/);
 assert.match(source('d3-18-physical-recovery.yml'),/if: github.event_name == 'workflow_dispatch'/);
 assert.match(source('d3-main-release-checkpoint.yml'),/release-checkpoint:/);
});
