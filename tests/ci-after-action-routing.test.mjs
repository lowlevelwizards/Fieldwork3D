import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {afterActionSpecs,afterActionPathMatches,selectAfterActionSuites}
 from '../scripts/verification/ci-specialist-routing.mjs';

const read=name=>readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8');
const ci=read('ci.yml');
const names=['debriefV41','debriefV42','debriefV43','debriefV44','debriefV45','debriefV5'];
const triggers=[
 ['debriefV41','feature/after-action-v4-navigation','src/ui/breach-after-action-panel.ts'],
 ['debriefV42','feature/after-action-v4-stage2-revision','src/ui/breach-after-action-panel.ts'],
 ['debriefV43','feature/after-action-v4-stage3-revision','src/ui/breach-after-action-panel.ts'],
 ['debriefV44','feature/after-action-v4-stage4-revision','src/ui/breach-after-action-panel.ts'],
 ['debriefV45','feature/after-action-v4-stage5-revision','src/ui/breach-after-action-panel.ts'],
 ['debriefV5','feature/after-action-v6-revision','src/ui/breach-after-action-panel.ts']
];

test('RC2k original six lane path owners and feature prefixes retained',()=>{
 assert.deepEqual(afterActionSpecs.map(x=>x.key),names);
 const sizes=[8,8,7,13,8,10];
 for(const [index,spec] of afterActionSpecs.entries()){
  assert.equal(spec.paths.length,sizes[index],spec.key);
  assert.ok(spec.paths.includes('.github/workflows/'+spec.workflow),spec.key);
  assert.ok(spec.prefixes.length>0,spec.key);
  assert.equal(spec.workflow,'after-action-acceptance.yml');
  const workflow=read(spec.workflow);
  assert.match(workflow,/^  workflow_call:$/m,spec.key);
  assert.match(workflow,/^  workflow_dispatch:$/m,spec.key);
  assert.doesNotMatch(workflow.split('\njobs:')[0],/^  pull_request:/m,spec.key);
 }
});
test('A5 glob matches original shared UI and stage-specific tests',()=>{
 assert.equal(afterActionPathMatches('src/ui/breach-after-action-*.ts',
  'src/ui/breach-after-action-timeline.ts'),true);
 assert.equal(afterActionPathMatches('src/ui/breach-after-action-*.ts',
  'src/ui/nested/breach-after-action-timeline.ts'),false);
 assert.equal(afterActionPathMatches('tests/after-action-v5-*.test.mjs',
  'tests/after-action-v5-compact.test.mjs'),true);
 assert.equal(afterActionPathMatches('tests/after-action-v5-*.test.mjs',
  'tests/after-action-v6-compact.test.mjs'),false);
});
test('A5 historical branch guards and shared-source stage selection',()=>{
 for(const [key,head,file] of triggers){
  const lanes=selectAfterActionSuites([file],head);
  assert.equal(lanes[key],true,key);
  for(const name of names){
   const expected=name===key||(name==='debriefV41'&&head.startsWith('feature/after-action-v4-'));
   assert.equal(lanes[name],expected,key+': '+name);
  }
 }
 for(const head of ['feature/weapon-polish','refactor/movement-recovery-r2',
  'feature/after-action-v4ish-stag3-wrong'])
  assert.ok(Object.values(selectAfterActionSuites(
   ['src/ui/breach-after-action-panel.ts'],head)).every(v=>v===false),head);
});
test('A5 original exact sources, smoke scripts and test files remain routed',()=>{
 for(const spec of afterActionSpecs){
  const head=spec.prefixes[0]+'audit';
  for(const file of spec.paths)
   if(!file.includes('*'))assert.equal(
    selectAfterActionSuites([file],head)[spec.key],true,
    spec.key+': '+file);
 }
 assert.equal(selectAfterActionSuites(
  ['tests/after-action-v5-compact.test.mjs'],'feat/after-action-v5-smoke').debriefV5,true);
 assert.equal(selectAfterActionSuites(
  ['tests/after-action-v6-layout.test.mjs'],'fix/after-action-v6-mobile-smoke').debriefV5,true);
 assert.equal(selectAfterActionSuites(
  ['src/breach-replay-archive.ts'],'feature/after-action-v4-stage4-test').debriefV44,true);
});
test('A5 integration branch still exercises persistent-3D and V5 live browser',()=>{
 const lanes=selectAfterActionSuites(['src/ui/breach-after-action-panel.ts'],'refactor/ci-after-action-shared-dispatch-a5-20261121');
 assert.deepEqual(lanes,{debriefV41:false,debriefV42:false,debriefV43:true,debriefV44:false,debriefV45:false,debriefV5:true});
});
test('RC2k shared workflow edits validate all lanes independent of branch',()=>{
 for(const head of ['chore/rc-repository-cleanup-batch3','feature/weapon-polish',''])
  assert.ok(Object.values(selectAfterActionSuites(['.github/workflows/after-action-acceptance.yml'],head)).every(Boolean));
});
test('A5 deterministic path routing regardless of ordering',()=>{
 const files=['src/ui/breach-after-action-panel.ts',
  'tests/after-action-v4-stage4-forensic.test.mjs',
  'src/ui/breach-after-action-panel.ts'];
 assert.deepEqual(selectAfterActionSuites(files,'feature/after-action-v4-stage4-test'),
  selectAfterActionSuites([...files].reverse(),'feature/after-action-v4-stage4-test'));
});
test('RC2k single CI caller and all authentic browser screenshots preserved',()=>{
 const workflow=read('after-action-acceptance.yml');
 assert.equal(ci.split('uses: ./.github/workflows/after-action-acceptance.yml').length-1,1);
 for(const key of ['debriefAny','debriefJSON']){
  assert.ok(ci.includes('steps.owners.outputs.'+key));
  assert.ok(ci.includes('needs.specialist-routing.outputs.'+key));
 }
 for(const [key,job,smoke,artifact] of [["debriefV41","navigation-and-browser","smoke-after-action-v3.mjs","after-action-v4-stage1-viewport-evidence"],["debriefV42","summary-and-squad","smoke-after-action-v3.mjs","after-action-v4-stage2-viewport-evidence"],["debriefV43","retained-models","smoke-after-action-v4-stage3.mjs","after-action-v4-stage3-webgl-captures"],["debriefV44","forensic","smoke-after-action-v4-stage4.mjs","after-action-v4-stage4-forensic"],["debriefV45","mission-investigation","smoke-after-action-v4-stage5.mjs","after-action-v4-stage5-investigation"],["debriefV5","browser-smoke","smoke-after-action-v5.mjs","after-action-v5-browser-evidence"]]){
  const body=workflow.split('\n  '+job+':\n')[1]?.split(/\n  [\w-]+:\n/)[0]||'';
  for(const needle of ['fromJSON(inputs.lanes).'+key,"inputs.lane == '"+key+"'",smoke,artifact,'actions/upload-artifact@v4','FIELDWORK_CI_CHROME'])
   assert.ok(body.includes(needle),key+' '+needle);
  assert.ok(workflow.includes('          - '+key+'\n'));
 }
 assert.ok(ci.includes('CI_HEAD_REF:'));
});
