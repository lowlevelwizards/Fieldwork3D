import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,enemies,stepSession} from '../src/breach-game.ts';
import {stalledInvestigationAction} from '../src/breach-ai-investigation.ts';
test('R5.1 optional motor clearance cannot swallow real acoustic alarm',()=>{
 const s=newSession(),a=enemies(s)[0];
 a.alert='idle';a.fireRetreatTarget={x:a.p.x+8,y:a.p.y};
 a.fireRetreatUntil=s.seconds+3;
 s.phase='running';s.started=true;
 s.noise.push({id:986421,p:{...a.p},radius:280,time:s.seconds,kind:'gunshot'});
 stepSession(s,1/60);
 assert.ok(a.suspicion.recentIds.includes('sound/986421'),
  'real sound evidence is received even during an optional clearance maneuver');
 assert.ok(!a.fireRetreatTarget||a.alert!=='idle',
  'actionable alarm can interrupt a muzzle-clearance detour');
});
test('R5.1 unreachable search goals cannot wait forever',()=>{
 assert.equal(stalledInvestigationAction(1.9,4),'continue');
 assert.equal(stalledInvestigationAction(2.8,4),'inspect-next');
 assert.equal(stalledInvestigationAction(3.4,0),'stand-down');
 const controller=readFileSync(new URL('../src/breach-enemy-decision-controller.ts',import.meta.url),'utf8');
 assert.match(controller,/a\.searchPauseUntil=s\.seconds-\.01/);
 assert.match(controller,/exhaustSuspicionSearch\(a\.suspicion,s\.seconds\)/);
});
test('R5.1 optional long survey uses real fixed-step Session actors',()=>{
 const source=readFileSync(new URL('../scripts/audit-mission-quality.mjs',import.meta.url),'utf8');
 assert.match(source,/longBehavior\?1200:360/);
 assert.match(source,/stepSession\(probe,1\/60\);survey\.sample\(probe,1\/60\)/);
});
