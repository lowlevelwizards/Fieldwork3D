import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,enemies,planMove,setFirePolicy,
  toggling,stepSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
test('151: HOLD is a persistent order and does not spend ammo',()=>{
 const s=newSession(0,100),a=team(s)[0],initial=a.magazine;
 assert.ok(setFirePolicy(s,a.id,'hold'));
 toggling(s);
 for(let i=0;i<90;i++)stepSession(s,1/60);
 assert.equal(a.magazine,initial);
 assert.equal(a.firePolicy,'hold');
 activateSite(null);
});
test('151: a waypoint fire policy is authored, copied and executed',()=>{
 const s=newSession(0,100),a=team(s)[0];
 const p={x:a.p.x,y:a.p.y-26};
 assert.ok(planMove(s,a.id,p));
 const n=a.plan.at(-1);
 assert.ok(setFirePolicy(s,a.id,'return',n.id));
 assert.equal(a.plan.at(-1).firePolicyState,'return');
 assert.equal(a.history.undo.at(-1).at(-1).firePolicyState,undefined);
 assert.equal(setFirePolicy(s,a.id,'focus',n.id,undefined,'UNSEEN'),false);
 activateSite(null);
});
test('151: suppression consumes real rounds but never makes hidden kills',()=>{
 const s=newSession(0,100),a=team(s)[0];
 const point={x:a.p.x+90,y:a.p.y};
 enemies(s).forEach(e=>e.health=0);
 assert.ok(setFirePolicy(s,a.id,'suppress',undefined,point));
 toggling(s);
 for(let i=0;i<170;i++)stepSession(s,1/60);
 assert.ok(a.shots>0,'area fire must produce observable rounds');
 assert.equal(a.kills,0);
 assert.equal(a.hits,0);
 assert.ok(s.battleEvents.some(e=>e.text.includes('SUPPRESSING')));
 activateSite(null);
});
test('151: mobile UI exposes explicit fire policies and target placement',()=>{
 const source=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(source,/ctxFire/);
 assert.match(source,/ctxFocus/);
 assert.match(source,/ctxSuppress/);
 assert.match(source,/FOCUS REQUIRES A VISIBLE ENEMY/);
});