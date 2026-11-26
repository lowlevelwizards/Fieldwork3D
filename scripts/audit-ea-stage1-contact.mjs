/** Paired immutable production contact witness; no alternate simulation. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {runStage1Scenario,stage1ContactSite} from '../tests/fixtures/breach-stage1-contract-runner.mjs';
import {team,enemies} from '../src/breach-game.ts';
const configure=s=>{
 const friendly=team(s),hostiles=enemies(s);
 assert.equal(friendly.length,4);assert.equal(hostiles.length,2);
 for(const a of friendly){
  const b=hostiles[0];a.heading=Math.atan2(b.p.y-a.p.y,b.p.x-a.p.x);
  a.weaponYaw=a.heading;a.firePolicy='engage';a.aim=.7;
 }
 for(const e of hostiles){
  const b=friendly[0];e.heading=Math.atan2(b.p.y-e.p.y,b.p.x-e.p.x);e.weaponYaw=e.heading;
 }
};
const run=()=>runStage1Scenario({site:stage1ContactSite(),mission:'hold',ticks:420,sampleEvery:30,configure});
const a=run(),b=run();
assert.equal(a.fingerprint,b.fingerprint);assert.deepEqual(a.checkpoints,b.checkpoints);
assert.ok(a.shotsFired>0);assert.equal(a.last.shotsFired,a.shotsFired);
assert.ok(a.events.some(e=>e.kind==='shot'&&e.actorId));
assert.ok(a.events.some(e=>e.kind==='down'&&e.actorId));
assert.ok(a.last.actors.some(x=>x.side==='red'&&x.health<a.first.actors.find(y=>y.id===x.id).health));
assert.ok(a.last.actors.some(x=>x.side==='red'&&(x.alert!=='idle'||x.shots>0||x.noiseId>0)));
const expected=process.argv[2];
assert.equal(a.fingerprint,expected,'exact audited contact fingerprint');
const summary={fingerprint:a.fingerprint,phase:a.phase,mission:a.mission,shots:a.shotsFired,
 actors:a.last.actors.map(x=>({id:x.id,side:x.side,health:x.health,shots:x.shots,alert:x.alert,noiseId:x.noiseId})),
 events:a.events.reduce((acc,e)=>(acc[e.kind]=(acc[e.kind]??0)+1,acc),{})};
console.log('EA production contact witness',JSON.stringify(summary));
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify({summary,checkpoints:a.checkpoints,events:a.events},null,2)+'\n');
