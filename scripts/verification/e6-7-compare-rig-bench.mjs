/** E6.7 release gate: exact mesh/UV/IK parity against pinned baseline,
 * report observational CPU ratios, never fail on host timing noise. */
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const [beforePath,afterPath,outPath]=process.argv.slice(2);
const before=JSON.parse(readFileSync(beforePath,'utf8'));
const after=JSON.parse(readFileSync(afterPath,'utf8'));
assert.equal(before.schema,'fieldwork-e6.7-cold-rig-v1');
assert.equal(after.schema,before.schema);
assert.deepEqual(after.appearance,before.appearance,
 'E6.7 must retain identical initial mesh/index/UV/normal/cut geometry');
assert.equal(after.batch,before.batch);
assert.equal(after.roundCount,before.roundCount);
for(const entry of after.rounds)
 for(const n of [...entry.createMs,entry.poseMs])
  assert.ok(Number.isFinite(n)&&n>=0,'timing must be finite');
const total=record=>record.rounds.reduce((sum,r)=>sum+r.totalCreateMs,0);
const t0=total(before),t1=total(after);
const output={schema:'fieldwork-e6.7-paired-comparison-v1',
 geometryAndPoseParity:true,
 baselineTotalRigCreateMs:+t0.toFixed(3),
 optimizedTotalRigCreateMs:+t1.toFixed(3),
 observationalRatio:+(t1/Math.max(.00001,t0)).toFixed(3),
 totalRigs:after.batch*after.roundCount,
 caveat:'Two separate Node processes on shared CI; variable clocks/JIT/GC. No speed threshold or mobile FPS claim.'};
if(outPath)writeFileSync(outPath,JSON.stringify(output,null,2)+'\n');
console.log('E6_7_COLD_RIG_COMPARE',JSON.stringify(output));
