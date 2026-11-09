import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,WALLS,COVER} from '../src/breach-core.ts';
import {newSession,enemies} from '../src/breach-game.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {scanEnemySoundEvidence} from '../src/breach-ai-acoustic-perception.ts';
import {interpretSound} from '../src/breach-sound-evidence.ts';
test('two simultaneous sessions retain independent wall geometry after an active-site swap',()=>{
 try{
  const s1=newSession(0,7,'full-view','small');
  const context1=sessionWorldGeometry(s1);
  const walls1=structuredClone(context1.walls);
  const s2=newSession(0,19,'full-view','small');
  const context2=sessionWorldGeometry(s2);
  assert.equal(context1.site,s1.site);
  assert.equal(context2.site,s2.site);
  assert.notEqual(context1,context2);
  assert.deepEqual(context1.walls,walls1);
  assert.notEqual(context1.walls,WALLS);
  assert.equal(context1.cover,s1.coverState);
  assert.equal(context2.cover,s2.coverState);
  s1.coverState[0].x+=4;
  assert.equal(context1.cover[0].x,s1.coverState[0].x);
 }finally{activateSite(null);}
});
test('enemy sound intake uses its own session walls after a different site is activated',()=>{
 try{
  const s1=newSession(0,7,'full-view','small');
  const guard=enemies(s1)[0];
  const p={x:guard.p.x+1,y:guard.p.y};
  const sound={id:999,p,radius:400,time:s1.seconds,kind:'door'};
  const expected=interpretSound(sound,guard.id,guard.p,s1.doors,
   sessionWorldGeometry(s1).walls,s1.windows);
  newSession(0,19,'full-view','small');
  s1.noise=[sound];guard.lastNoiseExaminedId=0;guard.lastNoiseExaminedAt=-1;
  const heard=scanEnemySoundEvidence(s1,guard);
  assert.deepEqual(heard,expected);
  assert.equal(guard.lastNoiseExaminedId,999);
 }finally{activateSite(null);}
});
