/** Compare the same frozen CPU workload, permitting intentional scheduler
 * and behavior changes only if the candidate repeats exactly. Do not
 * replace old outcome digests; emit both outcomes for review. */
import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const [a,b,c]=process.argv.slice(2).map(p=>JSON.parse(readFileSync(p,'utf8')));
for(const x of [a,b,c])assert.deepEqual(x.rows.map(r=>r.count),[4,8,16,32]);
for(let i=0;i<a.rows.length;i++){
 const base=a.rows[i],candidate=b.rows[i],repeat=c.rows[i];
 assert.deepEqual(candidate.identity,base.identity);
 assert.deepEqual(candidate.initial,base.initial);
 for(const key of ['ticks','phase','shots','identity','initial','final','fingerprint'])
  assert.deepEqual(candidate[key],repeat[key],candidate.count+' candidate repeat '+key);
 assert.ok(candidate.ticks>0);
 console.log('EB0 SCALE PAIR',JSON.stringify({count:base.count,base:base.tickMs,candidate:candidate.tickMs,
  changed:base.fingerprint!==candidate.fingerprint,baseShots:base.shots,candidateShots:candidate.shots,
  baseTicks:base.ticks,candidateTicks:candidate.ticks,basePhase:base.phase,candidatePhase:candidate.phase,
  baseFingerprint:base.fingerprint,candidateFingerprint:candidate.fingerprint}));
}
