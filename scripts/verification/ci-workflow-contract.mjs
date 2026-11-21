/** A9: verify the contracted CI and production gates cannot be silently bypassed.
 * Checks maintained workflows, not old branch-specific history or unused files.
 */
import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';

const paths={
 ci:'.github/workflows/ci.yml',
 architecture:'.github/workflows/architecture-refactor-critical.yml',
 browser:'.github/workflows/closeout-stage6-browser.yml',
 loadout:'.github/workflows/loadout-prep-l2-critical.yml',
 physical:'.github/workflows/f6-physical-equipment-critical.yml',
 arsenal:'.github/workflows/arsenal-m2-mount-inventory.yml',
 arsenalM30:'.github/workflows/arsenal-m30.yml',
 glockArt:'.github/workflows/glock-family-art.yml',
 replayRouter:'.github/workflows/replay-mobile-acceptance.yml',
 replayR2:'.github/workflows/replay-r2-ui-smoke.yml',
 replayR43b:'.github/workflows/replay-r43b-bodycam-ui.yml',
 replayR44:'.github/workflows/replay-r44-squad-entry.yml',
 replayR2Video:'.github/workflows/replay-r2-video-smoke.yml',
 replayR3Library:'.github/workflows/replay-r3-library-smoke.yml',
 replayR43Visual:'.github/workflows/replay-r43-bodycam-qa.yml',
 replayDirectorReset:'.github/workflows/replay-director-reset.yml',
 debrief1:'.github/workflows/after-action-v4-stage1.yml',
 debrief2:'.github/workflows/after-action-v4-stage2.yml',
 debrief3:'.github/workflows/after-action-v4-stage3.yml',
 debrief4:'.github/workflows/after-action-v4-stage4.yml',
 debrief5:'.github/workflows/after-action-v4-stage5.yml',
 debrief6:'.github/workflows/after-action-v5-critical.yml',
 d3retail:'.github/workflows/d3-14d2-retail-recovery.yml',
 d3departure:'.github/workflows/d3-17c-departure.yml',
 d3join:'.github/workflows/d3-17d-door-join.yml',
 d3recovery:'.github/workflows/d3-18-physical-recovery.yml',
 d3release:'.github/workflows/d3-main-release-checkpoint.yml',
 movementDoorRouter:'.github/workflows/movement-door-acceptance.yml',
 release7:'.github/workflows/release7-critical.yml',
 doorD5:'.github/workflows/door-traversal-d5.yml',
 doorD2D3:'.github/workflows/door-traversal-d2-d3.yml',
 passageQ5:'.github/workflows/passage-q5-matrix.yml',
 performanceP28:'.github/workflows/performance-p2-8-critical.yml',
 recovery17e:'.github/workflows/d3-17e-recovery.yml',
 physical25:'.github/workflows/d3-25-physical-acceptance.yml',
 coordinated15:'.github/workflows/d3-15-coordinated-release.yml',
 pages:'.github/workflows/pages.yml'
};
const read=path=>readFileSync(path,'utf8');
export function validateWorkflowContracts(wf){
 const must=(file,needle)=>assert.ok(wf[file].includes(needle),file+' missing '+needle);
 const no=(file,needle)=>assert.ok(!wf[file].includes(needle),file+' still contains '+needle);
 assert.ok(wf.ci.length<10000,'Primary CI has regrown into an obsolete branch gate catalog');
 const verifyOnly=wf.ci.split('\n  verify:')[1]?.split('\n  full-regression:')[0]||'';
 assert.ok(verifyOnly&&!verifyOnly.includes('startsWith(github.head_ref'),
  'Primary fixed-clock selector must not be branch-name gated');
 must('ci','ci-regression-plan.mjs --run');
 must('ci','ci-regression-plan.mjs --check');
 must('ci','ci-workflow-contract.mjs');
 must('ci','ci-workflow-inventory.mjs --check');
 must('ci','--test tests/ci-regression-plan.test.mjs');
 must('ci','npm test');
 must('ci','npm run build');
 must('ci','audit-pages-release-checkpoint.mjs');
 assert.equal(wf.ci.split('audit-pages-release-checkpoint.mjs').length-1,1,
  'Single release checkpoint must not be duplicated in primary CI');
 // The specialized gates are reusable jobs under the single PR CI orchestrator.
 // Keep their manual dispatch for focused acceptance, but never re-add a
 // separate pull_request trigger (which multiplies skipped workflow runs).
 must('ci','architecture-integration:');
 must('ci','browser-acceptance:');
 must('ci','uses: ./.github/workflows/architecture-refactor-critical.yml');
 must('ci','uses: ./.github/workflows/closeout-stage6-browser.yml');
 for(const workflow of ['architecture','browser']){
  must(workflow,'workflow_call:');
  must(workflow,'workflow_dispatch:');
  no(workflow,'  pull_request:');
 }
 for(const prefix of ['refactor/','feature/release1-','feature/release2-',
  'feature/release3-','feature/release4-','feature/release5-','feature/release6-'])
  must('ci',`startsWith(github.head_ref, '${prefix}')`);
 for(const prefix of ['refactor/closeout-stage6-','refactor/consolidation-'])
  must('ci',`startsWith(github.head_ref, '${prefix}')`);
 // A2: three high-volume specialist suites are routed by file ownership
 // rather than independently fired for every PR targeting main.
 must('ci','specialist-routing:');
 must('ci','ci-specialist-routing.mjs --github-output');
 must('ci','--test tests/ci-specialist-routing.test.mjs');
 for(const [name,job] of [['loadout','loadout-domain'],
  ['physical','physical-equipment-domain'],['arsenal','arsenal-mount-domain']]){
  must('ci',job+':');
  must('ci','uses: ./.github/workflows/'+paths[name].split('/').at(-1));
  must(name,'workflow_call:');
  must(name,'workflow_dispatch:');
  const triggers=wf[name].slice(0,wf[name].indexOf('jobs:'));
  assert.ok(!/^\s+- main\s*$/m.test(triggers),
   name+' still triggers every main PR');
  if(name!=='loadout')assert.ok(!triggers.includes('  pull_request:'),
   name+' still has an independent PR trigger');
 }
 // A3: physical movement PR verification has one current, witnessed
 // D3.30 + frozen D3.15B4 release gate. Obsolete earlier cohorts remain
 // individually runnable (including their non-main PR historical entry).
 must('ci','--test tests/ci-movement-routing.test.mjs');
 for(const [name,job,output] of [
  ['d3recovery','d3-recovery-critical','movementRecovery'],
  ['d3release','d3-main-physical-checkpoint','movementRelease']]){
  must('ci',job+':');
  must('ci','uses: ./.github/workflows/'+paths[name].split('/').at(-1));
  must('ci','needs.specialist-routing.outputs.'+output);
  must(name,'workflow_call:');
  must(name,'workflow_dispatch:');
 }
 for(const name of ['d3retail','d3departure','d3join']){
  no('ci','uses: ./.github/workflows/'+paths[name].split('/').at(-1));
  must(name,'workflow_call:');
  must(name,'workflow_dispatch:');
  must(name,'branches-ignore: [main]');
 }
 for(const contract of [
  'tests/release-d3-14d2-retail-rehearsal.test.mjs',
  'tests/release-d3-17c-physical-departure.test.mjs',
  'tests/release-d3-17d-door-route-join.test.mjs',
  'tests/ci-d3-physical-truth.test.mjs',
  'scripts/verify-d3-30-mainline.mjs',
  'scripts/verification/ci-d3-physical-truth.mjs',
  '--d329-cancellation-door-witness',
  '--d315b4-blind22'])
  must('d3release',contract);
 // A7a: live R7 and D2/D3/D5 exact physical acceptance, now nested under CI.
 must('ci','--test tests/ci-movement-door-routing.test.mjs');
 must('ci','movement-door-acceptance:');
 must('ci','needs.specialist-routing.outputs.movementDoorAny');
 must('ci','needs.specialist-routing.outputs.movementDoorJSON');
 must('ci','uses: ./.github/workflows/movement-door-acceptance.yml');
 must('movementDoorRouter','workflow_call:');
 must('movementDoorRouter','workflow_dispatch:');
 no('movementDoorRouter','  pull_request:');
 for(const [name,key,marker] of [
  ['release7','release7','scripts/audit-r7-squad-execution.mjs 11 900'],
  ['doorD5','doorD5','scripts/audit-door-traversal-baseline.mjs 4 1800'],
  ['doorD2D3','doorD2D3','scripts/audit-door-traversal-baseline.mjs 4 900']]){
  must(name,'workflow_call:');
  must(name,'workflow_dispatch:');
  no(name,'  pull_request:');
  must(name,'  push:');
  must(name,marker);
  must('movementDoorRouter','fromJSON(inputs.lanes).'+key);
  must('movementDoorRouter','uses: ./.github/workflows/'+paths[name].split('/').at(-1));
 }
 // A7b keeps historical/fresh physical arrival observations and strict witnesses.
 for(const [key,marker] of [
  ['recovery17e','--d315b4-blind22'],
  ['physical25','--d318-fresh22'],
  ['coordinated15','physicalArrivals<80']]){
  must(key,'workflow_call:');
  must(key,'workflow_dispatch:');
  no(key,'  pull_request:');
  must(key,'scripts/audit-r7-squad-execution.mjs');
  must(key,marker);
  must('movementDoorRouter','fromJSON(inputs.lanes).'+key);
  must('movementDoorRouter','uses: ./.github/workflows/'+paths[key].split('/').at(-1));
 }
 must('physical25','feature/d3-25-entry-stall-witness-20261118');
 // A7b append-only provenance checker preserves all historic physical floors;
 // an unverified lock event cannot satisfy the census.
 for(const key of ['physical25','recovery17e']){
  must(key,'--d329-cancellation-door-witness');
  must(key,'scripts/verification/ci-physical-cohort-provenance.mjs');
  must(key,'if: always()');
 }
 for(const marker of ['s.physicalArrivals<158','s.physicalCompletedFour<34',
  "['historical',81,18]","['frozen22',143,30]"])must('physical25',marker);
 for(const marker of ['physicalArrivals<80','physicalCompletedFour<18',
  'physicalArrivals<140','physicalCompletedFour<29'])must('recovery17e',marker);
 // A7b sibling reusable workflows must never share a caller-derived
 // concurrency group: doing so cancels an actual 11/22-site physical audit.
 for(const [key,prefix] of [
  ['recovery17e','d317e-recovery-'],
  ['coordinated15','d315-coordinated-'],
  ['physical25','d325-physical-']]){
  must(key,'group: '+prefix);
  no(key,'group: ${{ github.workflow }}');
 }
 // A7c retains full real Q5 approach matrix and measured sweep broadphase.
 for(const [key,marker] of [
  ['passageQ5','audit-passage-q5.mjs --extended --strict'],
  ['performanceP28','tests/performance-p2-8-sweep-broadphase.test.mjs']]){
  must(key,'workflow_call:');
  must(key,'workflow_dispatch:');
  no(key,'  pull_request:');
  must(key,marker);
  must('movementDoorRouter','fromJSON(inputs.lanes).'+key);
  must('movementDoorRouter','uses: ./.github/workflows/'+paths[key].split('/').at(-1));
 }
 must('passageQ5','--release-a --extended --strict');
 must('performanceP28','tests/performance-p2-7-live-routing.test.mjs');
 // A4: M30 production and Glock art browser acceptance are single
 // source-selected reusable CI jobs. Original smoke and evidence are retained.
 must('ci','--test tests/ci-weapon-visual-routing.test.mjs');
 for(const [name,job,output] of [
  ['arsenalM30','arsenal-m30-visual','arsenalM30'],
  ['glockArt','glock-family-visual','glockArt']]){
  must('ci',job+':');
  must('ci','uses: ./.github/workflows/'+paths[name].split('/').at(-1));
  must('ci','needs.specialist-routing.outputs.'+output);
  must(name,'workflow_call:');
  must(name,'workflow_dispatch:');
 }
 const m30Triggers=wf.arsenalM30.slice(0,wf.arsenalM30.indexOf('jobs:'));
 assert.ok(!m30Triggers.includes('  pull_request:'),
  'M30 still creates independent main PR runs');
 const glockTriggers=wf.glockArt.slice(0,wf.glockArt.indexOf('jobs:'));
 assert.ok(glockTriggers.includes('branches-ignore: [main]'),
  'Glock must keep non-main PRs but not duplicate main PR runs');
 for(const smoke of ['smoke-arsenal-m30-shotgun-visual.mjs',
  'smoke-arsenal-m30c3-modular-visual.mjs',
  'smoke-arsenal-m30c4-runtime-visual.mjs',
  'smoke-arsenal-m30c5-runtime-visual.mjs',
  'arsenal-m30-physical-visual-smoke'])
  must('arsenalM30',smoke);
 must('glockArt','smoke-consolidation-p9-arsenal.mjs');
 must('glockArt','beretta-m9-art-review');

 // A5: preserve all six stage-specific real debrief browser suites, while
 // only the primary CI creates a main PR workflow run.
 must('ci','--test tests/ci-after-action-routing.test.mjs');
 must('ci','CI_HEAD_REF:');
 for(const [name,job,output] of [
  ['debrief1','debrief-v4-navigation','debriefV41'],
  ['debrief2','debrief-v4-summary','debriefV42'],
  ['debrief3','debrief-v4-persistent3d','debriefV43'],
  ['debrief4','debrief-v4-forensic','debriefV44'],
  ['debrief5','debrief-v4-timeline','debriefV45'],
  ['debrief6','debrief-v5-browser','debriefV5']]){
  must('ci',job+':');
  must('ci','uses: ./.github/workflows/'+paths[name].split('/').at(-1));
  must('ci','needs.specialist-routing.outputs.'+output);
  must(name,'workflow_call:');
  must(name,'workflow_dispatch:');
  const header=wf[name].slice(0,wf[name].indexOf('jobs:'));
  assert.ok(!/^  pull_request:/m.test(header),name+' still launches independent PR');
  must(name,'actions/upload-artifact@v4');
  must(name,'FIELDWORK_CI_CHROME');
 }
 for(const [name,smoke,artifact] of [
  ['debrief1','smoke-after-action-v3.mjs','after-action-v4-stage1-viewport-evidence'],
  ['debrief2','smoke-after-action-v3.mjs','after-action-v4-stage2-viewport-evidence'],
  ['debrief3','smoke-after-action-v4-stage3.mjs','after-action-v4-stage3-webgl-captures'],
  ['debrief4','smoke-after-action-v4-stage4.mjs','after-action-v4-stage4-forensic'],
  ['debrief5','smoke-after-action-v4-stage5.mjs','after-action-v4-stage5-investigation'],
  ['debrief6','smoke-after-action-v5.mjs','after-action-v5-browser-evidence']]){
  must(name,smoke);
  must(name,artifact);
 }
 must('debrief3',"startsWith(github.head_ref, 'refactor/ci-after-action-')");
 must('debrief6',"startsWith(github.head_ref, 'refactor/ci-after-action-')");
 // A6a: one nested reusable dispatch for historical replay mobile lanes.
 must('ci','--test tests/ci-replay-mobile-routing.test.mjs');
 must('ci','replay-mobile-acceptance:');
 must('ci','needs.specialist-routing.outputs.replayMobileAny');
 must('ci','needs.specialist-routing.outputs.replayMobileJSON');
 must('ci','uses: ./.github/workflows/replay-mobile-acceptance.yml');
 must('replayRouter','workflow_call:');
 no('replayRouter','  pull_request:');
 for(const [name,key,smoke] of [
  ['replayR2','replayR2','smoke-replay-r2-ui.mjs'],
  ['replayR43b','replayR43b','smoke-replay-r43b-bodycam-ui.mjs'],
  ['replayR44','replayR44','smoke-replay-r44-entry-mobile.mjs']]){
  must(name,'workflow_call:');
  must(name,'workflow_dispatch:');
  no(name,'  pull_request:');
  must(name,smoke);
  must('replayRouter','fromJSON(inputs.lanes).'+key);
  must('replayRouter','uses: ./.github/workflows/'+paths[name].split('/').at(-1));
 }
 must('replayR43b','smoke-replay-r43b-indoor-entry.mjs');
 // A6b: same nested replay dispatcher owns archive, video and original
 // 3D bodycam visual evidence, with no independent main PR workflow runs.
 must('ci','--test tests/ci-replay-legacy-routing.test.mjs');
 for(const [key,smoke] of [
  ['replayR2Video','smoke-replay-r2-video.mjs'],
  ['replayR3Library','smoke-replay-r3-library.mjs'],
  ['replayR43Visual','smoke-replay-r43-bodycam.mjs']]){
  must(key,'workflow_call:');
  must(key,'workflow_dispatch:');
  no(key,'  pull_request:');
  must(key,smoke);
  must('replayRouter','fromJSON(inputs.lanes).'+key);
  must('replayRouter','uses: ./.github/workflows/'+paths[key].split('/').at(-1));
 }
 // A6c: unlike historical feature-only replay jobs, the shoulder
 // invariants remain active on EVERY source-owned PR branch.
 must('ci','--test tests/ci-replay-director-routing.test.mjs');
 must('replayDirectorReset','workflow_call:');
 must('replayDirectorReset','workflow_dispatch:');
 no('replayDirectorReset','  pull_request:');
 must('replayRouter','fromJSON(inputs.lanes).replayDirectorReset');
 must('replayRouter','uses: ./.github/workflows/replay-director-reset.yml');
 for(const t of [
  'tests/replay-director-reset.test.mjs',
  'tests/replay-director-cam.test.mjs',
  'tests/replay-director-r101-shoulder-invariant.test.mjs',
  'tests/replay-bodycam-controller-20261109.test.mjs',
  'tests/replay-camera-controller-20261109.test.mjs',
  'tests/replay-knowledge-controller-20261109.test.mjs',
  'tests/replay-lifecycle-controller-20261109.test.mjs',
  'tests/replay-playback-controller-20261109.test.mjs'])
  must('replayDirectorReset',t);
 must('replayR43Visual','replay-r43-bodycam-screenshots');
 must('replayR3Library','IndexedDB save/reload/watch/delete');
 must('replayR2Video','Chromium replay video + sound integration smoke');
 must('replayR44','tests/replay-r44-real-session.test.mjs');
 must('arsenal','smoke-arsenal-m25-visual.mjs');
 must('arsenal','audit-pages-release-checkpoint.mjs');
 must('architecture','breach-critical-suite.mjs');
 must('architecture','package-a-closeout-suite.mjs --run');
 must('architecture',"startsWith(github.head_ref, 'refactor/consolidation-')");
 must('architecture','breach-architecture-boundaries.mjs');
 must('architecture','ci-workflow-contract.mjs');
 must('architecture','refactor/');
 must('architecture','npm run build');
 must('browser','tactical-flow:');
 must('browser','replay-and-lab:');
 must('browser','refactor/consolidation-');
 must('browser','smoke-closeout-stage6.mjs');
 must('browser','smoke-replay-r43b-bodycam-ui.mjs');
 must('browser','smoke-operator-lab-unified.mjs');
 must('pages','npm run build');
 must('pages','fieldwork-build.json');
 must('pages','Verify public Pages serves expected build');
 // Release A: the deployed artifact may not be uploaded if these
 // compact tactical/replay/resource regressions did not pass first.
 must('pages','Critical tactical, fog, Studio and resource regressions');
 for(const check of [
  'tests/passage-q5-approaches.test.mjs',
  'tests/animation-a3-11-progressive-urgency.test.mjs',
  'tests/fog-exterior-unseen-apertures-regression.test.mjs',
  'tests/operator-studio-main-menu.test.mjs',
  'tests/performance-p8-replay-memory.test.mjs'
 ])must('pages',check);

 const missing=[];
 for(const text of Object.values(wf)){
  for(const match of text.matchAll(/\b(?:tests\/[\w.-]+\.test\.mjs|scripts\/[\w./-]+\.mjs)\b/g))
   if(!existsSync(match[0]))missing.push(match[0]);
 }
 assert.deepEqual([...new Set(missing)],[],'Broken executable references in maintained workflows');
 return {workflows:Object.keys(wf).length,primaryLines:wf.ci.split('\n').length};
}
const result=validateWorkflowContracts(Object.fromEntries(
 Object.entries(paths).map(([key,path])=>[key,read(path)])));
console.log('A9 CI and Pages workflow contracts verified:',JSON.stringify(result));
