/** H1 release exception to pinned D1 / D2.5 ten-workload baselines.
 * NEVER accept arbitrary changed gameplay. These exact, reviewed
 * fingerprints represent platform-handling changes to the scripted contact
 * firefight; D2.3's separately accepted Vale correction is verified at
 * field level below. All other workloads remain byte-exact.
 *
 * This is an integration gate, NOT the D0 comparator or a gameplay change.
 */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const [beforePath,afterPath]=process.argv.slice(2);
assert.ok(beforePath&&afterPath,'Usage: node scripts/verify-arsenal-h1-intent-delta.mjs before.json after.json');
const before=JSON.parse(readFileSync(beforePath,'utf8'));
const after=JSON.parse(readFileSync(afterPath,'utf8'));
assert.equal(before.summary.version,1);
assert.equal(after.summary.version,1);
assert.equal(before.workloads.length,10);
assert.equal(after.workloads.length,10);

const CONTACT_BEFORE='002b44fe6fdf7df3466ec70ab3827ceeb4c2b192af81a7ed6a36565a31488196';
const CONTACT_H1='d0455815550b275485c08efe01aa2af8ec6a88ac854ef8d76e172e28a651d9be';
const HOLD_BEFORE='68e22497104f8ce10b3748b17aad0b5aaa830ee64dff1cdaa0431a4ceb7ef223';
const HOLD_D23='d72ff3393327fd5a79aa58d3c258807206d71ef5f7b14d35c2e322dee3655af8';
const same=(a,b,label)=>assert.deepEqual(a,b,'Unexpected H1 gameplay change: '+label);
const unaffected=['seed','mission','phase','status','seconds','accepted',
 'seenGround','civilians','doors','objective','extract'];

let contactChanges=0,holdChanges=0;
for(let i=0;i<10;i++){
 const old=before.workloads[i],now=after.workloads[i];
 same(now.label,old.label,'workload order');
 same(now.ticks,old.ticks,'fixed simulation ticks in '+old.label);
 if(old.fingerprint===now.fingerprint)continue;
 if(old.label==='active-contact-firefight'){
  contactChanges++;
  same(old.fingerprint,CONTACT_BEFORE,'pinned contact baseline');
  same(now.fingerprint,CONTACT_H1,'reviewed H1 contact fingerprint');
  // The revised combat may change shots, actor health, recoil and event
  // sequences. It must not drift the map, mission, civilians or objectives.
  for(const key of unaffected)same(now.truth[key],old.truth[key],
   'contact '+key);
  same(now.truth.replay.complete,true,'H1 replay completeness');
  same(now.truth.replay.duration,old.truth.replay.duration,'H1 replay duration');
  same(now.truth.replay.samples,old.truth.replay.samples,'H1 replay samples');
  continue;
 }
 if(old.label==='mission-hold'){
  holdChanges++;
  same(old.fingerprint,HOLD_BEFORE,'pinned D1 hold baseline');
  same(now.fingerprint,HOLD_D23,'reviewed D2.3 hold fingerprint');
  const b=old.truth,a=now.truth;
  for(const key of Object.keys(b))if(key!=='ops'&&key!=='replay')
   same(a[key],b[key],'D2.3 hold '+key);
  same(a.ops.length,b.ops.length,'D2.3 operator count');
  let changed=0;
  for(let j=0;j<b.ops.length;j++){
   if(JSON.stringify(b.ops[j])===JSON.stringify(a.ops[j]))continue;
   changed++;
   const from=b.ops[j],to=a.ops[j];
   same(from[0],'vale','D2.3 actor identity');
   same(to[0],'vale','D2.3 changed actor identity');
   same([...to.slice(0,2),...to.slice(3)],
    [...from.slice(0,2),...from.slice(3)],'D2.3 operator state');
   const dx=to[2].x-from[2].x,dy=to[2].y-from[2].y;
   assert.ok(dx<0&&dx>=-5&&Math.abs(dy)<.5,'D2.3 bounded step');
  }
  same(changed,1,'D2.3 changed operator count');
  for(const key of Object.keys(b.replay))
   if(key!=='steps')same(a.replay[key],b.replay[key],'D2.3 replay '+key);
  same(a.replay.steps,b.replay.steps+1,'D2.3 extra replay step');
  continue;
 }
 assert.fail('Unapproved change to workload '+old.label);
}
same(contactChanges,1,'exact H1 changed-workload count');
assert.ok(holdChanges===0||holdChanges===1,'D2.3 change count');
console.log('H1 INTENT VERIFIED: reviewed contact fingerprint, unchanged mission/environment/replay completeness, D2.3 bounded correction if present, all other workload fingerprints exact.');
