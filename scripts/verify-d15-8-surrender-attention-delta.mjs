/** D15.8 narrow reviewed exception: surrender is not an active threat.
 * The other nine current-main workloads remain bit-exact. In the scripted
 * firefight, removing passive aim at surrendered contacts may change only
 * blue heading, visibility footprint and resulting replay step count.
 * Fixed fingerprints protect the entire ten-workload behavior from drift.
 */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const [beforePath,afterPath]=process.argv.slice(2);
assert.ok(beforePath&&afterPath,
 'Usage: node scripts/verify-d15-8-surrender-attention-delta.mjs before.json after.json');
const before=JSON.parse(readFileSync(beforePath,'utf8'));
const after=JSON.parse(readFileSync(afterPath,'utf8'));
assert.equal(before.summary.version,1);assert.equal(after.summary.version,1);
assert.equal(before.workloads.length,10);assert.equal(after.workloads.length,10);
const PREVIOUS_CONTACT='854a770f74a88a70483edac64f4c0901439e85c0fb23542b31dd09e9d621eb4b';
const NEW_CONTACT='71705ac0e7cbaf59a2071a9bfc423ea668595bff646243241eb8fcbd6fa8b380';
let changed=0;
for(let i=0;i<10;i++){
 const a=before.workloads[i],b=after.workloads[i];
 assert.equal(a.label,b.label,'same workload ordering');
 assert.equal(a.ticks,b.ticks,'same fixed ticks in '+a.label);
 if(a.fingerprint===b.fingerprint)continue;
 assert.equal(a.label,'active-contact-firefight',
  'unreviewed changed workload: '+a.label);
 changed++;
 assert.equal(a.fingerprint,PREVIOUS_CONTACT,'pinned production firefight');
 assert.equal(b.fingerprint,NEW_CONTACT,'reviewed D15.8 nonthreat contact');
 const old=a.truth,newer=b.truth;
 assert.equal(old.ops.length,newer.ops.length,'same actor identities');
 let blueHeadingChanges=0;
 for(let j=0;j<old.ops.length;j++){
  const prior=old.ops[j],next=newer.ops[j];
  assert.deepEqual([...next.slice(0,3),...next.slice(4)],
   [...prior.slice(0,3),...prior.slice(4)],
   'no operator physical position, casualty, objective or other state change');
  if(prior[3]!==next[3]){
   assert.equal(prior[1],'blue','only friendly gaze may change');
   blueHeadingChanges++;
  }
 }
 assert.ok(blueHeadingChanges>0,'D15.8 must actually change passive attention');
 const sanitized={...newer,
  ops:old.ops,seenGround:old.seenGround,
  replay:{...newer.replay,steps:old.replay.steps}};
 assert.deepEqual(sanitized,old,
  'all remaining mission, combat, door, event and replay facts stay exact');
 assert.ok(newer.seenGround>=old.seenGround&&
   newer.seenGround<=old.seenGround+500,'view footprint is bounded');
 assert.equal(newer.replay.steps,old.replay.steps+2,
  'only the two extra legitimate heading replay steps are accepted');
}
assert.equal(changed,1,'exactly one reviewed workload changes');
console.log('D15.8 INTENT VERIFIED: nine workloads exact; only surrendered-threat passive facing changed in pinned firefight.');
