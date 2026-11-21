import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {replayDirectorResetPaths,selectReplayDirectorReset}
 from '../scripts/verification/ci-specialist-routing.mjs';

const read=name=>readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8');
const original=[
 'src/breach-replay-director-reset.ts',
 'src/breach-replay-*-controller.ts',
 'src/breach-main.ts',
 'src/breach-replay-camera-controller.ts',
 'src/breach-replay-director-controller.ts',
 'src/breach-replay-director-subject-timeline.ts',
 'index.html','tests/replay-director-cam.test.mjs',
 'tests/replay-director-reset.test.mjs',
 'tests/replay-*-controller-20261109.test.mjs',
 'tests/replay-lifecycle-controller-20261109.test.mjs',
 '.github/workflows/replay-director-reset.yml'
];
test('A6c original director path-glob list is unchanged',()=>{
 assert.deepEqual(replayDirectorResetPaths,original);
 for(const file of original)if(!file.includes('*'))
  assert.equal(selectReplayDirectorReset([file]),true,file);
});
test('A6c any PR branch retains deterministic camera/shoulder ownership',()=>{
 const relevant=['src/breach-main.ts','index.html',
  'src/breach-replay-director-reset.ts',
  'src/breach-replay-camera-controller.ts',
  'src/breach-replay-playback-controller.ts',
  'tests/replay-bodycam-controller-20261109.test.mjs',
  'tests/replay-director-cam.test.mjs'];
 for(const file of relevant)
  assert.equal(selectReplayDirectorReset([file]),true,file);
 for(const head of ['feature/beretta','fix/replay-camera',
  'refactor/movement-r6','refactor/ci-replay-director-shared-a6c']){
  // Deliberately branch-independent: the current-replay gate cannot be
  // accidentally scoped to an obsolete replay feature prefix.
  assert.equal(selectReplayDirectorReset(['src/breach-main.ts']),true,head);
 }
});
test('A6c unrelated docs, art, movement, and unknown legacy paths do not dispatch director reset',()=>{
 for(const file of ['docs/readme.md','src/breach-motor-collision.ts',
  'src/weapons/geometry/beretta-m9-silhouettes.ts',
  'tests/random-example.test.mjs',
  'src/breach-replay-camera-settings.ts'])
  assert.equal(selectReplayDirectorReset([file]),false,file);
});
test('A6c source classifier is order stable and independent of duplicate paths',()=>{
 const files=['src/breach-main.ts','src/breach-main.ts','docs/notes.md'];
 assert.equal(selectReplayDirectorReset(files),true);
 assert.equal(selectReplayDirectorReset([...files].reverse()),true);
 assert.equal(selectReplayDirectorReset([]),false);
});
test('A6c current shoulder suite is reused under existing primary PR dispatch',()=>{
 const ci=read('ci.yml'),replay=read('replay-mobile-acceptance.yml'),
  director=read('replay-director-reset.yml');
 const header=director.slice(0,director.indexOf('\njobs:'));
 assert.match(header,/^  workflow_call:$/m);
 assert.match(header,/^  workflow_dispatch:$/m);
 assert.doesNotMatch(header,/^  pull_request:/m);
 assert.match(replay,/fromJSON\(inputs.lanes\).replayDirectorReset/);
 assert.equal(replay.split('uses: ./.github/workflows/replay-director-reset.yml').length-1,1);
 assert.ok(ci.includes('tests/ci-replay-director-routing.test.mjs'));
 assert.ok(ci.includes('needs.specialist-routing.outputs.replayMobileAny'));
 assert.ok(ci.length<10000);
 assert.match(director,/^  shoulder-invariants:/m);
 for(const name of [
  'tests/replay-director-reset.test.mjs',
  'tests/replay-director-cam.test.mjs',
  'tests/replay-director-r101-shoulder-invariant.test.mjs',
  'tests/replay-bodycam-controller-20261109.test.mjs',
  'tests/replay-camera-controller-20261109.test.mjs',
  'tests/replay-knowledge-controller-20261109.test.mjs',
  'tests/replay-lifecycle-controller-20261109.test.mjs',
  'tests/replay-playback-controller-20261109.test.mjs'])
  assert.ok(director.includes(name),name);
});
