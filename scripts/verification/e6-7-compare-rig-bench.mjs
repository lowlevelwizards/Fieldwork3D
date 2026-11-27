/** E6.7 release gate: exact mesh/UV/IK parity against pinned baseline,
 * report observational CPU ratios, never fail on host timing noise. */
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const [beforePath,afterPath,outPath]=process.argv.slice(2);
const before=JSON.parse(readFileSync(beforePath,'utf8'));
const after=JSON.parse(readFileSync(afterPath,'utf8'));
assert.equal(before.schema,'fieldwork-e6.7-cold-rig-v1');
assert.equal(after.schema,before.schema);
assert.deepEqual(after.nonFootwear,before.nonFootwear,
 'Non-footwear mesh/index/UV/normal/cut geometry must remain identical');
assert.equal(after.appearance.segments,before.appearance.segments,'all IK segment cuts retained');
const deltaMeshes=(after.appearance.meshes-after.nonFootwear.meshes)-(before.appearance.meshes-before.nonFootwear.meshes);
const deltaVertices=(after.appearance.vertices-after.nonFootwear.vertices)-(before.appearance.vertices-before.nonFootwear.vertices);
assert.ok(deltaMeshes<=6,'selected footwear must stay within six additional cold meshes');
assert.ok(deltaVertices<=360,'selected footwear must stay within 360 additional cold vertices');
assert.equal(after.batch,before.batch);
assert.equal(after.roundCount,before.roundCount);
for(const entry of after.rounds)
 for(const n of [...entry.createMs,entry.poseMs])
  assert.ok(Number.isFinite(n)&&n>=0,'timing must be finite');
const total=record=>record.rounds.reduce((sum,r)=>sum+r.totalCreateMs,0);
const t0=total(before),t1=total(after);
const output={schema:'fieldwork-e6.7-paired-comparison-v1',
 nonFootwearGeometryAndPoseParity:true,
 fullGeometryIdentical:after.appearance.hash===before.appearance.hash,
 footwearMeshDelta:deltaMeshes,footwearVertexDelta:deltaVertices,
 baselineTotalRigCreateMs:+t0.toFixed(3),
 optimizedTotalRigCreateMs:+t1.toFixed(3),
 observationalRatio:+(t1/Math.max(.00001,t0)).toFixed(3),
 totalRigs:after.batch*after.roundCount,
 caveat:'Two separate Node processes on shared CI; variable clocks/JIT/GC. No speed threshold or mobile FPS claim.'};
if(outPath)writeFileSync(outPath,JSON.stringify(output,null,2)+'\n');
console.log('E6_7_COLD_RIG_COMPARE',JSON.stringify(output));
