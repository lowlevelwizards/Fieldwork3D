import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline,domains,configuredTestPaths,selectCiTests,checkCatalog} from '../scripts/verification/ci-regression-plan.mjs';

test('A9 catalog is complete and keeps unique domain names',()=>{
 const result=checkCatalog();
 assert.equal(result.domains,7);
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
test('workflow and documentation-only changes need baseline, not broad replay',()=>{
 const p=selectCiTests(['.github/workflows/ci.yml','docs/readme.md']);
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
