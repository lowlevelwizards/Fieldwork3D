/** EB4–7: generated behavior is intentionally changed. Preserve physical
 * encounter identity, authored route acceptance, exact candidate repeatability
 * and existing audited invariants; record outcome differences for review. */
import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const [base,candidate,repeat]=process.argv.slice(2).map(p=>JSON.parse(readFileSync(p,'utf8')));
const key=r=>[r.seed,r.mission,r.entry].join('/');
const indexed=x=>new Map(x.records.map(r=>[key(r),r]));
const a=indexed(base),b=indexed(candidate),c=indexed(repeat);
assert.equal(a.size,15);assert.equal(b.size,a.size);assert.equal(c.size,a.size);
for(const [id,old] of a){
 const next=b.get(id),again=c.get(id);assert.ok(next&&again,id);
 for(const field of ['initialHostiles','initialCivilians','initialSquadPosition','doorAuthored'])
  assert.deepEqual(next[field],old[field],id+' physical '+field);
 assert.equal(next.fingerprint,again.fingerprint,id+' deterministic behavior');
 assert.deepEqual(next.firstContact,again.firstContact,id+' deterministic contact');
 assert.equal(next.actualShots,again.actualShots,id+' deterministic shooting');
 assert.deepEqual(next.violations,[]);
}
for(const x of [candidate,repeat]){
 assert.equal(x.summary.exceptions,0);assert.equal(x.summary.unreasonablyStationary,0);
 assert.equal(x.summary.emptyRoutes,0);assert.equal(x.summary.doorsOpened,x.summary.doorsAuthored);
}
console.log('EB BEHAVIOR PAIRED',JSON.stringify({cases:a.size,changed:[...a].filter(([id,r])=>r.fingerprint!==b.get(id).fingerprint).length,physicalStartParity:true,repeatParity:true}));
