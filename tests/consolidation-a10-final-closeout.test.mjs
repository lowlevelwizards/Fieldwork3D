import test from 'node:test';
import assert from 'node:assert/strict';
import {stageCoverage,integrationCoverage,followupChecks,suiteFiles,checkSuite}
 from '../scripts/verification/package-a-closeout-suite.mjs';

test('Consolidation Package A stage A0 through A10 each has a named acceptance test',()=>{
 const catalog=checkSuite();
 assert.equal(catalog.stages,11);
 assert.deepEqual(stageCoverage.map(x=>x.stage),Array.from({length:11},(_,i)=>'A'+i));
 assert.ok(stageCoverage.every(x=>x.test.startsWith('tests/')));
});
test('A10 closeout keeps distinct stage tests and deduplicates integrations',()=>{
 const files=suiteFiles();
 assert.equal(new Set(files).size,files.length);
 assert.ok(files.includes('tests/consolidation-stage8-world-ownership.test.mjs'));
 assert.ok(files.includes('tests/consolidation-a6-main-composition.test.mjs'));
 assert.ok(files.includes('tests/ci-regression-plan.test.mjs'));
 assert.ok(files.includes('tests/consolidation-a10-final-closeout.test.mjs'));
});
test('A10 retains deterministic 60 Hz, fog, replay and lifecycle parity sentinels',()=>{
 for(const path of [
  'tests/breach-closeout-stage2-simulation-phases.test.mjs',
  'tests/breach-closeout-stage3-presentation.test.mjs',
  'tests/breach-closeout-stage5-world-isolation.test.mjs',
  'tests/breach-closeout-stage6-integration.test.mjs',
  'tests/breach-roadmap2-stage3-knowledge.test.mjs',
  'tests/breach-roadmap2-stage12-world-context.test.mjs'
 ])assert.ok(integrationCoverage.includes(path),path);
});
test('A10 retains live After Action V4 cross-branch regression',()=>{
 assert.ok(integrationCoverage.includes('tests/after-action-v4-stage3-persistent-models.test.mjs'));
 assert.ok(integrationCoverage.includes('tests/after-action-v4-stage4-forensic.test.mjs'));
});
test('A10 includes architecture and workflow integrity as executable checks',()=>{
 assert.ok(followupChecks.includes('scripts/verification/breach-architecture-boundaries.mjs'));
 assert.ok(followupChecks.includes('scripts/verification/ci-workflow-contract.mjs'));
});
