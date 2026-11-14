/** D2.3 is intentionally behavior-changing only for transient fire
 * corrections. Preserve the exact D1/D2.2 truth everywhere else.
 * This verifier is for the D2.3 branch gate ONLY; ordinary D2.1/D2.2
 * releases retain strict complete 10-workload equality.
 */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const [prior,current]=process.argv.slice(2).map(p=>
 JSON.parse(readFileSync(p,'utf8')));
assert.equal(prior.workloads.length,10);
assert.equal(current.workloads.length,10);
let differences=0;
for(let i=0;i<10;i++){
 const old=prior.workloads[i],now=current.workloads[i];
 assert.equal(old.label,now.label);
 if(old.fingerprint===now.fingerprint)continue;
 differences++;
 assert.equal(old.label,'mission-hold',
  'unexpected gameplay change outside the known D2.3 correction case');
 const before=old.truth,after=now.truth;
 for(const key of Object.keys(before)){
  if(key==='ops'||key==='replay')continue;
  assert.deepEqual(after[key],before[key],
   'D2.3 must not change mission, ammo, effects, objectives, doors, civilians or events: '+key);
 }
 assert.equal(before.ops.length,after.ops.length);
 let alteredActors=0;
 for(let j=0;j<before.ops.length;j++){
  const b=before.ops[j],a=after.ops[j];
  if(JSON.stringify(b)===JSON.stringify(a))continue;
  alteredActors++;
  assert.equal(b[0],'vale');
  assert.equal(a[0],'vale');
  // Every tactical field except the small final physical translation
  // must be identical (health, heading, enemy status, orders, etc).
  assert.deepEqual([...a.slice(0,2),...a.slice(3)],
   [...b.slice(0,2),...b.slice(3)]);
  const dx=a[2].x-b[2].x,dy=a[2].y-b[2].y;
  assert.ok(dx<0&&dx>=-5&&Math.abs(dy)<.5,
   'only a short abandoned self-step is accepted: '+JSON.stringify({dx,dy}));
 }
 assert.equal(alteredActors,1);
 for(const field of Object.keys(before.replay))
  if(field!=='steps')assert.deepEqual(after.replay[field],before.replay[field],
   'replay contract '+field);
 assert.equal(after.replay.steps,before.replay.steps+1);
}
assert.equal(differences,1,
 'this D2.3 intent contract must not silently bless unrelated future drift');
console.log('D2.3 INTENT DELTA VERIFIED: only one partial Vale correction in mission-hold; all combat, door, objective, observed intel, casualty and event truth matches, and replay remains complete.');
