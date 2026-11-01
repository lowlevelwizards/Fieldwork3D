import test from 'node:test';
import assert from 'node:assert/strict';
import {CASING_LIMIT,casingAt,impactProfile} from '../src/breach-effects.ts';
import {newSession,team} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
test('133: bounded, deterministic casing flight and settling',()=>{
 const c={id:12,weapon:'carbine',side:'blue',at:2,
   x:40,z:12,y:20,heading:.8};
 assert.deepEqual(casingAt(c,3.5),casingAt(c,3.5));
 assert.ok(casingAt(c,3.7).settled);
 assert.ok(casingAt(c,2.15).y>casingAt(c,3).y);
 assert.equal(CASING_LIMIT,96);
 for(const surface of ['stone','wood','metal','dust','blood']){
  const p=impactProfile(surface);
  assert.ok(p.count>0&&p.count<9&&p.lifetime>0&&p.lifetime<.5);
 }
});
test('133: casing events survive snapshots and rewinding',()=>{
 const s=newSession(0),a=team(s)[0];
 s.casings.push({id:3,at:0,x:a.p.x,z:a.p.y,y:22,
   weapon:'smg',side:'blue',heading:1});
 const original=s.casings[0];
 const frame=snapshot(s);
 s.casings.length=0;
 applyReplayFrame(s,frame);
 assert.deepEqual(s.casings[0],original);
 assert.equal(casingAt(s.casings[0],s.seconds).settled,false);
});