import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {replayMobileSpecs,selectReplayMobileSuites}
 from '../scripts/verification/ci-specialist-routing.mjs';

const read=name=>readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8');
const keySet=['replayR2','replayR43b','replayR44'];
const originals={
 replayR2:[
  'index.html','src/breach-style.css','src/breach-main.ts',
  'src/breach-replay-cinematic-director.ts',
  'src/breach-replay-director-intent.ts',
  'src/breach-replay-director-events.ts',
  'src/breach-replay-director-shots.ts',
  'src/breach-replay-director-scheduler.ts',
  'tests/replay-r7-director.test.mjs',
  'src/breach-replay-speed.ts','src/breach-camera-occlusion.ts',
  'tests/replay-r7-speed.test.mjs','tests/replay-r7-cutaway.test.mjs',
  'src/breach-3d.ts','tests/replay-r5-direct-viewer.test.mjs',
  'scripts/smoke-replay-r2-ui.mjs',
  '.github/workflows/replay-r2-ui-smoke.yml'
 ],
 replayR43b:[
  'index.html','src/breach-main.ts','src/breach-style.css',
  'src/breach-replay-bodycam-controls.ts','src/breach-replay-bodycam.ts',
  'src/breach-replay-personal-visibility.ts',
  'src/breach-replay-window-knowledge.ts','src/breach-replay-video.ts',
  'src/breach-replay-archive.ts','src/breach-replay.ts',
  'src/breach-3d.ts','scripts/smoke-replay-r43b-video.mjs',
  'scripts/smoke-replay-r43b-bodycam-ui.mjs',
  'scripts/smoke-replay-r43b-moving-scene.mjs',
  'scripts/smoke-replay-r43b-indoor-entry.mjs',
  '.github/workflows/replay-r43b-bodycam-ui.yml'
 ],
 replayR44:[
  'index.html','src/breach-main.ts','src/breach-style.css',
  'src/breach-replay-squad-entry.ts',
  'tests/replay-r44-squad-entry.test.mjs',
  'tests/replay-r44-real-session.test.mjs',
  'scripts/smoke-replay-r44-entry-mobile.mjs',
  '.github/workflows/replay-r44-squad-entry.yml'
 ]
};
const eligible={
 replayR2:'feature/replay-r2-mobile-ui-a6a',
 replayR43b:'feature/replay-r43b-bodycam-a6a',
 replayR44:'feature/replay-r44-squad-a6a'
};
test('A6a all original replay mobile PR path filters survive exact matching',()=>{
 assert.deepEqual(replayMobileSpecs.map(s=>s.key),keySet);
 for(const spec of replayMobileSpecs){
  assert.deepEqual(spec.paths,originals[spec.key],spec.key);
  for(const file of spec.paths)
   assert.equal(selectReplayMobileSuites([file],eligible[spec.key])[spec.key],
    true,spec.key+' / '+file);
 }
});
test('A6a original R2 historical feature branches all remain eligible',()=>{
 const spec=replayMobileSpecs[0];
 const prefixes=['feature/replay-r2-mobile-ui-','feature/replay-r3-',
  'feature/replay-r41-','feature/replay-r42-','feature/replay-r42b-',
  'feature/replay-r42c-','feature/replay-ux-v2-','feature/replay-r5-',
  'feature/replay-r6-','feature/replay-r7-'];
 assert.deepEqual(spec.prefixes,prefixes);
 for(const p of prefixes)assert.equal(selectReplayMobileSuites(
  ['src/breach-main.ts'],p+'verification').replayR2,true,p);
});
test('A6a original R43b and R44 branch-prefix specificity is unchanged',()=>{
 assert.deepEqual(replayMobileSpecs[1].prefixes,['feature/replay-r43b-']);
 assert.deepEqual(replayMobileSpecs[2].prefixes,['feature/replay-r44-']);
 for(const [key,head] of Object.entries(eligible)){
  const lane=selectReplayMobileSuites(['index.html'],head);
  for(const other of keySet)assert.equal(lane[other],other===key,key+' '+other);
 }
});
test('A6a shared source edit does not launch replay browser checks on unrelated branches',()=>{
 const files=['src/breach-style.css','index.html','src/breach-main.ts'];
 for(const head of ['feature/beretta-d11','refactor/movement-recovery-r3',
  'refactor/ci-after-action-shared','feature/replay-r43-no-b']){
  const lanes=selectReplayMobileSuites(files,head);
  assert.deepEqual(lanes,{replayR2:false,replayR43b:false,replayR44:false},head);
 }
 assert.deepEqual(selectReplayMobileSuites([],eligible.replayR44),{
  replayR2:false,replayR43b:false,replayR44:false});
});
test('A6a live integration checks two real mobile replay browser lanes',()=>{
 const integration='refactor/ci-replay-mobile-shared-a6a-20261121';
 const files=replayMobileSpecs.map(s=>'.github/workflows/'+s.workflow);
 assert.deepEqual(selectReplayMobileSuites(files,integration),{
  replayR2:false,replayR43b:true,replayR44:true
 });
 const same=selectReplayMobileSuites([...files].reverse().concat(files),integration);
 assert.deepEqual(same,selectReplayMobileSuites(files,integration));
});
test('A6a no independent PR run, manual replay and historical branch guards retained',()=>{
 for(const spec of replayMobileSpecs){
  const yaml=read(spec.workflow),header=yaml.split('\njobs:')[0];
  assert.match(header,/^  workflow_call:$/m);
  assert.match(header,/^  workflow_dispatch:$/m);
  assert.doesNotMatch(header,/^  pull_request:/m);
  assert.ok(yaml.includes("github.event_name == 'workflow_dispatch'"),spec.key);
  for(const prefix of spec.prefixes)assert.ok(
   yaml.includes("startsWith(github.head_ref, '"+prefix+"')"),prefix);
 }
});
test('A6a one compact nested CI lane preserves real R2, Bodycam and squad entry browser evidence',()=>{
 const ci=read('ci.yml'),nested=read('replay-mobile-acceptance.yml');
 assert.ok(ci.includes('  replay-mobile-acceptance:'));
 assert.ok(ci.includes('needs.specialist-routing.outputs.replayMobileAny'));
 assert.ok(ci.includes('needs.specialist-routing.outputs.replayMobileJSON'));
 assert.equal(ci.split('uses: ./.github/workflows/replay-mobile-acceptance.yml').length-1,1);
 assert.ok(ci.includes('tests/ci-replay-mobile-routing.test.mjs'));
 assert.ok(ci.length<10000,'primary CI must not regrow into 10000+ bytes');
 for(const spec of replayMobileSpecs){
  assert.ok(nested.includes('fromJSON(inputs.lanes).'+spec.key),spec.key);
  assert.equal(nested.split('uses: ./.github/workflows/'+spec.workflow).length-1,1);
 }
 const r2=read('replay-r2-ui-smoke.yml');
 for(const name of ['smoke-replay-r2-ui.mjs',
  'tests/replay-r7-cutaway.test.mjs','audit-pages-release-checkpoint.mjs'])
  assert.ok(r2.includes(name),name);
 const bodycam=read('replay-r43b-bodycam-ui.yml');
 for(const name of ['smoke-replay-r43b-video.mjs',
  'smoke-replay-r43b-bodycam-ui.mjs','smoke-replay-r43b-moving-scene.mjs',
  'smoke-replay-r43b-indoor-entry.mjs','replay-r43b-bodycam-ui',
  'actions/upload-artifact@v4'])
  assert.ok(bodycam.includes(name),name);
 const r44=read('replay-r44-squad-entry.yml');
 for(const name of ['tests/replay-r44-real-session.test.mjs',
  'smoke-replay-r44-entry-mobile.mjs','npm run build'])
  assert.ok(r44.includes(name),name);
});
