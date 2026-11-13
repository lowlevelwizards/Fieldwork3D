import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {withCoverPropIds,withSitePropIds,coverTargetIndex,coverTargetToken}
 from '../src/worldgen/site-object-identity.ts';
import {relocateCover} from '../src/breach-movable-cover.ts';
import {damageCover} from '../src/breach-reactive-cover.ts';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {captureMissionStart,siteForMissionRestart}
 from '../src/breach-mission-restart.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {activateSite} from '../src/breach-core.ts';
test('C1: stable prop IDs, preserves custom IDs, does not mutate legacy input',()=>{
 const original=[{x:1,y:2,w:20,h:10},{x:2,y:2,w:25,h:15,id:'custom'},
  {x:3,y:2,w:20,h:10,id:'custom'}];
 const stable=withCoverPropIds(original);
 assert.deepEqual(original.map(o=>o.id),[undefined,'custom','custom']);
 assert.equal(new Set(stable.map(o=>o.id)).size,3);
 assert.equal(stable[1].id,'custom');
 assert.deepEqual(withCoverPropIds(original),stable);
 assert.equal(withCoverPropIds(stable),stable,'no unnecessary copies for normalized cover');
 assert.equal(coverTargetToken(stable[2],2),stable[2].id);
 assert.equal(coverTargetIndex(stable,stable[2].id),2);
 assert.equal(coverTargetIndex(stable,'2'),2,'legacy index is supported');
 assert.equal(coverTargetIndex(stable,'missing'),-1);
 assert.equal(coverTargetIndex(stable,'999'),-1);
 assert.equal(coverTargetIndex(stable,'0'),0);
});

test('C1: relocation and cover collapse keep logical identity and original input',()=>{
 const source=[{id:'seat-1',x:50,y:50,w:18,h:18,fixture:'chair'}];
 const cover=withCoverPropIds(source).map(x=>({...x}));
 assert.equal(relocateCover(cover,0,{x:53,y:50},[],[],[]),true);
 assert.equal(cover[0].id,'seat-1');
 assert.equal(source[0].x,50);
 damageCover(cover[0],100);
 assert.equal(cover[0].id,'seat-1');
 assert.equal(coverTargetIndex(cover,'seat-1'),0);
});

test('C1: site, session, restart and replay preserve IDs without array remapping',()=>{
 try{
  const site=generateSite(16,'small');
  assert.ok(site.cover.length>0);
  assert.ok(site.cover.every(o=>!!o.id));
  assert.equal(new Set(site.cover.map(o=>o.id)).size,site.cover.length);
  const repeated=generateSite(16,'small');
  assert.deepEqual(site.cover.map(o=>o.id),repeated.cover.map(o=>o.id));
  assert.equal(withSitePropIds(site),site);
  const s=newSession(0,16,'floor-plan','small',undefined,site);
  assert.deepEqual(s.coverState.map(o=>o.id),site.cover.map(o=>o.id));
  const start=captureMissionStart(s,'small');
  assert.deepEqual(siteForMissionRestart(start)?.cover.map(o=>o.id),
    site.cover.map(o=>o.id));
  const frame=snapshot(s);
  assert.deepEqual(frame.coverState.map(o=>o.id),site.cover.map(o=>o.id));
  applyReplayFrame(s,frame);
  assert.deepEqual(s.coverState.map(o=>o.id),site.cover.map(o=>o.id));
 }finally{activateSite(null);}
});

test('C1: planned prop interactions use stable ID with historical index compatibility',()=>{
 const src=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
 assert.match(src('breach-game.ts'),/coverTargetToken\(item\.o,item\.index\)/);
 assert.match(src('breach-order-interactions.ts'),/coverTargetIndex\(s\.coverState,id\)/);
 assert.match(src('breach-session-factory.ts'),/withSitePropIds\(loadedSite\)/);
 assert.match(src('breach-replay.ts'),/withCoverPropIds\(f\.coverState\)/);
});
