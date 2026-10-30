import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,enemies,toggling,stepSession}
  from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
const dist=(a,b)=>Math.hypot(a.p.x-b.p.x,a.p.y-b.p.y);
test('143C: point-blank contact creates a cooldown and possible knockback',()=>{
  const s=newSession(),a=team(s)[0],b=enemies(s)[0];
  a.p={x:300,y:615};a.heading=0;
  b.p={x:314,y:615};b.heading=Math.PI;
  b.fireCd=0;
  const before=dist(a,b);
  toggling(s);stepSession(s,1/60);
  assert.ok(a.lastBashAt>=0);
  assert.ok(b.lastBashAt>=0);
  assert.ok(b.fireCd>.3);
  assert.ok(dist(a,b)>before);
  const bash=a.lastBashAt;
  stepSession(s,1/60);
  assert.equal(a.lastBashAt,bash,'no infinite repeated bashing');
  activateSite(null);
});
test('143C: cautious defender ducks behind real cover',()=>{
  const s=newSession(),a=enemies(s)[0];
  a.p={x:203,y:189};a.heading=Math.PI;
  a.personality='cautious';a.alert='cover';
  a.suppression=.7;a.watch={x:117,y:189};
  toggling(s);stepSession(s,1/60);
  assert.equal(a.posture,'crouch');
  activateSite(null);
});