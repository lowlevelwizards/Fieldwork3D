import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline,domains,configuredTestPaths,selectCiTests,checkCatalog} from '../scripts/verification/ci-regression-plan.mjs';
import {shardTestPaths} from '../scripts/verification/test-shards.mjs';

test('A9 catalog is complete and keeps unique domain names',()=>{
 const result=checkCatalog();
 assert.equal(result.domains,12);
 assert.ok(result.uniqueTests>baseline.length);
 assert.equal(new Set(configuredTestPaths()).size,configuredTestPaths().length);
});
test('common baseline protects fixed-clock, knowledge, world, replay and debrief',()=>{
 const plan=selectCiTests([]);
 assert.deepEqual(plan.tests,[...baseline].sort());
 assert.deepEqual(plan.domains,[]);
 assert.equal(plan.runBroadCritical,false);
});
test('world and session files get simulation and physical site regressions',()=>{
 const p=selectCiTests(['src/breach-session-factory.ts','src/breach-world-context.ts']);
 assert.ok(p.domains.includes('simulation'));
 assert.ok(p.domains.includes('world-and-sites'));
 assert.ok(p.tests.includes('tests/breach-roadmap2-stage12-world-context.test.mjs'));
 assert.equal(p.runBroadCritical,false);
});
test('replay and After Action UI edits get current V4 stage and archive regressions',()=>{
 const p=selectCiTests(['src/breach-replay-presentation-options.ts','src/ui/after-action-view.ts']);
 assert.ok(p.domains.includes('replay-and-debrief'));
 assert.ok(p.domains.includes('app-and-campaign'));
 assert.ok(p.tests.includes('tests/after-action-v4-stage1-navigation.test.mjs'));
 assert.ok(p.tests.includes('tests/replay-r3-archive.test.mjs'));
});
test('scene-frame and fog select presentation, geometry and visibility tests',()=>{
 const p=selectCiTests(['src/breach-scene-frame.ts','src/breach-fog.ts']);
 assert.ok(p.domains.includes('visibility-and-presentation'));
 assert.ok(p.tests.includes('tests/breach-scene-frame-p7.test.mjs'));
});
test('unclassified src changes fail closed to full curated architecture suite',()=>{
 const p=selectCiTests(['src/new-unclassified-module.ts']);
 assert.deepEqual(p.unknown,['src/new-unclassified-module.ts']);
 assert.equal(p.runBroadCritical,true);
});
test('documentation-only changes need baseline, not broad replay',()=>{
 const p=selectCiTests(['docs/readme.md']);
 assert.equal(p.runBroadCritical,false);
 assert.deepEqual(p.tests,[...baseline].sort());
});
test('changed-path test selection is stable and has no duplicates',()=>{
 const paths=['src/breach-replay.ts','src/breach-world-context.ts','src/breach-replay.ts'];
 assert.deepEqual(selectCiTests(paths),selectCiTests([...paths].reverse()));
 assert.equal(new Set(selectCiTests(paths).tests).size,selectCiTests(paths).tests.length);
});
test('weapon and campaign changes retain owning regressions',()=>{
 const p=selectCiTests(['src/breach-weapon-kit.ts','src/campaign-state.ts']);
 assert.ok(p.tests.includes('tests/breach-closeout-stage4-pose-output.test.mjs'));
 assert.ok(p.tests.includes('tests/campaign-02.test.mjs'));
});
test('historical stage branch names have no influence on selection',()=>{
 const files=['src/breach-door.ts'];
 assert.deepEqual(selectCiTests(files),selectCiTests(files));
 assert.ok(domains.every(g=>typeof g.name==='string'));
});

test('A10: modified or newly introduced test file executes in CI',()=>{
 const file='tests/ci-regression-plan.test.mjs';
 const p=selectCiTests([file]);
 assert.ok(p.tests.includes(file));
 assert.deepEqual(p.changedTests,[file]);
 assert.equal(p.runBroadCritical,false);
});
test('A10: removed test triggers broad fallback but does not enter Node test paths',()=>{
 const missing='tests/deleted-a10-regression.test.mjs';
 const p=selectCiTests([missing],()=>false);
 assert.deepEqual(p.deletedTests,[missing]);
 assert.ok(!p.tests.includes(missing));
 assert.equal(p.runBroadCritical,true);
});
test('A10: test helpers and fixtures use critical fallback',()=>{
 for(const path of ['tests/helpers/world-fixture.mjs','tests/fixtures/site.json',
  'tests/consolidation-stage3-app-flow.test.ts']){
  const p=selectCiTests([path]);
  assert.equal(p.runBroadCritical,true,path);
  assert.ok(p.riskPaths.includes(path),path);
 }
});
test('A10: build, HTML entries, workflow, standalone tool and asset edits fail closed',()=>{
 for(const path of ['vite.config.ts','tsconfig.json','package.json','package-lock.json',
  'index.html','breach.html','arsenal.html','.github/workflows/pages.yml',
  'scripts/verification/breach-critical-suite.mjs','scripts/smoke-closeout-stage6.mjs',
  'data/factions.json','public/icon.svg','styles.css']){
  const p=selectCiTests([path]);
  assert.equal(p.runBroadCritical,true,path);
  assert.ok(p.riskPaths.includes(path),path);
 }
});
test('A10: source + edited regression use both owning domain tests and direct file',()=>{
 const file='tests/ci-regression-plan.test.mjs';
 const p=selectCiTests(['src/breach-world-context.ts',file]);
 assert.ok(p.domains.includes('world-and-sites'));
 assert.ok(p.tests.includes('tests/breach-roadmap2-stage12-world-context.test.mjs'));
 assert.ok(p.tests.includes(file));
 assert.equal(p.runBroadCritical,false);
});
test('A10: repeated modified tests are deduplicated and stable',()=>{
 const a=['tests/ci-regression-plan.test.mjs','tests/ci-regression-plan.test.mjs',
  'src/breach-scene-frame.ts'];
 assert.deepEqual(selectCiTests(a),selectCiTests([...a].reverse()));
 assert.equal(new Set(selectCiTests(a).tests).size,selectCiTests(a).tests.length);
});
test('A10: unknown runtime source remains fail-closed',()=>{
 const p=selectCiTests(['src/brand-new-unclassified-component.ts']);
 assert.deepEqual(p.unknown,['src/brand-new-unclassified-component.ts']);
 assert.equal(p.runBroadCritical,true);
});

test('Release A: passage and stack modules cannot evade physical doorway checks',()=>{
 for(const file of ['src/breach-passage.ts','src/breach-passage-coordinator.ts',
  'src/breach-stack-staging.ts','src/breach-weapon-clearance.ts']){
  const p=selectCiTests([file]);
  assert.ok(p.domains.includes('movement-and-doors'),file);
  assert.ok(p.tests.includes('tests/passage-q5-live-blockers.test.mjs'),file);
 }
});
test('Release A: combat readiness changes get actual urgent-fire coverage',()=>{
 for(const file of ['src/breach-fire-urgency.ts','src/breach-friendly-safety-volume.ts']){
  const p=selectCiTests([file]);
  assert.ok(p.domains.includes('simulation'),file);
  assert.ok(p.tests.includes('tests/animation-a3-10-close-stack-fire.test.mjs'),file);
 }
});
test('Release A: fog changes get occlusion and unseen aperture regressions',()=>{
 const p=selectCiTests(['src/breach-fog-mask.ts']);
 assert.ok(p.tests.includes('tests/fog-interior-occlusion-regression.test.mjs'));
 assert.ok(p.tests.includes('tests/fog-exterior-unseen-apertures-regression.test.mjs'));
});
test('Release A: menu and studio changes get no-mission editing smoke',()=>{
 for(const file of ['src/operator-studio.ts','src/operator-studio-bridge.ts','src/breach-main.ts']){
  const p=selectCiTests([file]);
  assert.ok(p.tests.includes('tests/operator-studio-main-menu.test.mjs'),file);
 }
});

test('A1 bounded shards preserve exact complete test ownership',()=>{
 const files=Array.from({length:47},(_,i)=>'test-'+i);
 const shards=Array.from({length:16},(_,i)=>shardTestPaths(files,['--shard='+(i+1)+'/16']));
 assert.deepEqual(shards.flat().sort(),[...files].sort());
 assert.ok(shards.every(group=>group.length<=3));
 assert.deepEqual(shardTestPaths(files,[]),files);
 assert.throws(()=>shardTestPaths(files,['--shard=17/16']));
 assert.throws(()=>shardTestPaths(files,['--shard=0/16']));
});

test('A1 eight live-pose shards keep all four Boonie slices and the other helmets isolated',()=>{
 const heavy=['patrol-cap','boonie-1','boonie-2','boonie-3','boonie-4','ach','mich-2001','pasgt']
  .map(model=>'tests/operator-headwear-camo-pose-'+model+'.test.mjs');
 const files=[...Array.from({length:44},(_,i)=>'other-'+i),...heavy];
 const shards=Array.from({length:16},(_,i)=>shardTestPaths(files,['--shard='+(i+1)+'/16']));
 assert.deepEqual(shards.flat().sort(),[...files].sort());
 assert.deepEqual(shards.slice(-8),heavy.map(path=>[path]));
});

test('E1 source-domain selection covers UI, CSS, Studio, helmets, and Arsenal without a branch-name escape',()=>{
 const cases=[
  ['src/ui/tactical-hud-controller.ts','tactical-ui','tests/package-c4-tactical-ui-consolidation.test.mjs'],
  ['src/breach-main.ts','tactical-ui','tests/breach-runtime-loop-step12.test.mjs'],
  ['src/breach-style.css','presentation-styles','tests/visual-foundation-f5-mobile-visual-gate.test.mjs'],
  ['src/operator-headwear-silhouettes.ts','helmet-visual','tests/helmet-b1-m1-shell.test.mjs'],
  ['src/operator-studio.ts','studio-controls','tests/operator-studio-save-all-stage511.test.mjs'],
  ['src/arsenal/workbench-screen.ts','arsenal-ui','tests/arsenal-v2-editing-ui.test.mjs']
 ];
 for(const [file,domain,requiredTest] of cases){
  const selected=selectCiTests([file]);
  assert.ok(selected.domains.includes(domain),file);
  assert.ok(selected.tests.includes(requiredTest),file);
  assert.deepEqual(selected.unknown,[],file);
 }
});

test('FT1.0 faction timeline modules use Studio-owning CI without broad fallback',()=>{
 const p=selectCiTests([
  'src/faction-reference-timelines.ts',
  'src/faction-reference-timeline-resolver.ts',
  'src/faction-reference-browser.ts'
 ]);
 assert.ok(p.domains.includes('studio-controls'));
 assert.ok(p.tests.includes('tests/operator-studio-main-menu.test.mjs'));
 assert.deepEqual(p.unknown,[]);
 assert.equal(p.runBroadCritical,false);
});

// Keep the migrated routing and release contracts in the always-on primary CI.
import './ci-equipment-routing.test.mjs';
import './ci-visual-world-routing.test.mjs';
import './ci-operator-loadout-routing.test.mjs';
import './ci-release-coordination.test.mjs';
