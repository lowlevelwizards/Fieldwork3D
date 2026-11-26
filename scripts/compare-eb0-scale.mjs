import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const [a,b]=process.argv.slice(2).map(p=>JSON.parse(readFileSync(p,'utf8')));
assert.deepEqual(a.rows.map(r=>r.count),[4,8,16,32]);
assert.deepEqual(b.rows.map(r=>r.count),[4,8,16,32]);
for(let i=0;i<a.rows.length;i++){
 const base=a.rows[i],candidate=b.rows[i];
 assert.equal(candidate.ticks,base.ticks);assert.equal(candidate.phase,base.phase);
 assert.equal(candidate.shots,base.shots);assert.deepEqual(candidate.identity,base.identity);
 assert.equal(candidate.fingerprint,base.fingerprint,'behavior-neutral EB scale parity '+base.count);
 console.log('EB0 SCALE PAIR',JSON.stringify({count:base.count,base:base.tickMs,candidate:candidate.tickMs}));
}
