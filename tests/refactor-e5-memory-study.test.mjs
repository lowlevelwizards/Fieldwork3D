import test from 'node:test';
import assert from 'node:assert/strict';
import {runE5MemoryStudy}
 from '../scripts/verification/refactor-e5-replay-memory.mjs';

test('E5.0 deterministic replay allocation study matches the old film',()=>{
 const report=runE5MemoryStudy({frames:43});
 assert.equal(report.sameHistoricalFingerprint,true);
 assert.equal(report.baseline.digest,report.optimized.digest);
 assert.equal(report.optimized.frames,43);
 assert.equal(report.optimized.retainedEffectArrayReferences,
  report.baseline.retainedEffectArrayReferences);
 assert.ok(report.optimized.avoidedArrays>0);
 assert.ok(report.optimized.avoidedValueObjects>0);
});
