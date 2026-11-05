import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,stepSession,enemies} from '../src/breach-game.ts';
test('E1-B: sound processed while a suspicious enemy is orienting',()=>{
 const s=newSession(),a=enemies(s)[0];
 s.phase='running';s.seconds=2;
 a.alert='suspicious';a.contacted=false;
 a.heard={...a.p};a.alertUntil=3.5;
 s.noise.push({id:9012,p:{...a.p},radius:180,time:s.seconds,kind:'footstep'});
 stepSession(s,1/60);
 assert.ok(a.suspicion.pressure>.15);
 assert.equal(a.suspicion.lastCause,'footstep');
 assert.ok(a.suspicion.recentIds.includes('sound/9012'));
});
test('E1-B: a processed acoustic event is not double-counted next tick',()=>{
 const s=newSession(),a=enemies(s)[0];
 s.phase='running';s.seconds=2;
 a.alert='suspicious';a.contacted=false;a.heard={...a.p};a.alertUntil=3.5;
 s.noise.push({id:9013,p:{...a.p},radius:180,time:s.seconds,kind:'door'});
 stepSession(s,1/60);
 const found=a.suspicion.recentIds.filter(x=>x==='sound/9013');
 assert.equal(found.length,1);
 stepSession(s,1/60);
 assert.equal(a.suspicion.recentIds.filter(x=>x==='sound/9013').length,1);
});
