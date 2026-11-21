import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {replayLegacySpecs,selectReplayLegacySuites,selectReplayMobileSuites}
 from '../scripts/verification/ci-specialist-routing.mjs';

const workflow=name=>readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8');
const script=name=>readFileSync(new URL('../scripts/'+name,import.meta.url),'utf8');
const owned={
 replayR2Video:['src/breach-replay-video.ts','src/breach-replay-audio.ts',
  'src/breach-main.ts','index.html','scripts/smoke-replay-r2-video.mjs',
  '.github/workflows/replay-r2-video-smoke.yml'],
 replayR3Library:['src/breach-replay-archive.ts','src/breach-replay-motion.ts',
  'src/breach-replay-library.ts','src/breach-replay-portable.ts',
  'src/breach-main.ts','index.html','scripts/smoke-replay-r3-library.mjs',
  '.github/workflows/replay-r3-library-smoke.yml'],
 replayR43Visual:['src/breach-replay-bodycam.ts','src/breach-3d.ts',
  'src/breach-main.ts','src/breach-operator-rig.ts',
  'scripts/smoke-replay-r43-bodycam.mjs',
  '.github/workflows/replay-r43-bodycam-qa.yml']
};
const branches={
 replayR2Video:['feature/replay-r2-audio-'],
 replayR3Library:['feature/replay-r3-library-',
  'feature/replay-r3-portable-','feature/replay-ux-v2-release-c-'],
 replayR43Visual:['feature/replay-r43-']
};
test('A6b original path filters and historical branch scopes are exact',()=>{
 assert.deepEqual(replayLegacySpecs.map(s=>s.key),
  ['replayR2Video','replayR3Library','replayR43Visual']);
 for(const spec of replayLegacySpecs){
  assert.deepEqual(spec.paths,owned[spec.key],spec.key);
  assert.deepEqual(spec.prefixes,branches[spec.key],spec.key);
  for(const branch of spec.prefixes)
   for(const file of spec.paths)
    assert.equal(selectReplayLegacySuites([file],branch+'acceptance')[spec.key],
     true,spec.key+': '+file);
 }
});
test('A6b unrelated branches and unowned paths never launch historical browser checks',()=>{
 for(const ref of ['refactor/movement-r5','feature/beretta-p16',
  'refactor/ci-replay-mobile-shared-a6a-20261121']){
  const actual=selectReplayLegacySuites(['src/breach-main.ts','index.html'],ref);
  assert.deepEqual(actual,{replayR2Video:false,
   replayR3Library:false,replayR43Visual:false},ref);
 }
 assert.deepEqual(selectReplayLegacySuites(['docs/notes.md'],
   'feature/replay-r43-acceptance'),
  {replayR2Video:false,replayR3Library:false,replayR43Visual:false});
});
test('A6b integration branch enables all three real archive/video/bodycam browser suites',()=>{
 const files=replayLegacySpecs.map(s=>'.github/workflows/'+s.workflow);
 assert.deepEqual(selectReplayLegacySuites(files,
  'refactor/ci-replay-archive-visual-a6b-20261121'),
  {replayR2Video:true,replayR3Library:true,replayR43Visual:true});
 assert.deepEqual(selectReplayLegacySuites(files, 'feature/replay-r43-smoke'),
  selectReplayLegacySuites([...files].reverse(),'feature/replay-r43-smoke'));
 assert.deepEqual(selectReplayMobileSuites(files,
  'refactor/ci-replay-archive-visual-a6b-20261121'),
  {replayR2:false,replayR43b:false,replayR44:false});
});
test('A6b three historical workflows retain manual and full browser acceptance',()=>{
 const nested=workflow('replay-mobile-acceptance.yml');
 const ci=workflow('ci.yml');
 assert.ok(ci.includes('node --test tests/ci-replay-legacy-routing.test.mjs'));
 assert.ok(ci.includes('uses: ./.github/workflows/replay-mobile-acceptance.yml'));
 assert.ok(ci.length<10000);
 for(const spec of replayLegacySpecs){
  const w=workflow(spec.workflow),header=w.slice(0,w.indexOf('\njobs:'));
  assert.match(header,/^  workflow_call:$/m,spec.key);
  assert.match(header,/^  workflow_dispatch:$/m,spec.key);
  assert.doesNotMatch(header,/^  pull_request:$/m,spec.key);
  for(const p of spec.prefixes)
   assert.ok(w.includes("startsWith(github.head_ref, '"+p+"')"),p);
  assert.ok(w.includes("github.event_name == 'workflow_dispatch'"),spec.key);
  assert.ok(nested.includes('fromJSON(inputs.lanes).'+spec.key),spec.key);
  assert.equal(nested.split('uses: ./.github/workflows/'+spec.workflow).length-1,
   1,spec.key);
 }
 for(const [key,name] of [['replayR2Video','replay-r2-video-smoke.yml'],
  ['replayR3Library','replay-r3-library-smoke.yml'],
  ['replayR43Visual','replay-r43-bodycam-qa.yml']])
  assert.ok(replayLegacySpecs.find(s=>s.key===key)?.workflow===name);
});
test('A6b real encoder, IndexedDB and dev-only WebGL bodycam evidence survive',()=>{
 const video=script('smoke-replay-r2-video.mjs');
 for(const item of ['channel:\'chromium\'','replayExportVideo',
  'replayMediaProbe','video.onloadedmetadata','withAudio',
  'replayShareToggle','saveReplayDebrief','replayLibraryList'])
  assert.ok(video.includes(item),item);
 const library=script('smoke-replay-r3-library.mjs');
 for(const item of ['replayLibrarySupported','restoreReplayArchive',
  'replayImportInput','getSavedReplayBookmarks','data-confirm="yes"'])
  assert.ok(library.includes(item),item);
 const qa=script('smoke-replay-r43-bodycam.mjs');
 for(const item of ['__fieldworkBodycamQa.activate','maskRestored',
  'colorBuckets','helmet-rewind','saveReplayDebrief','replayLibraryList'])
  assert.ok(qa.includes(item),item);
 assert.ok(workflow('replay-r43-bodycam-qa.yml')
  .includes('replay-r43-bodycam-screenshots'));
});
