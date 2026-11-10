import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession} from '../src/breach-game.ts';
import {activateSite,WALLS,COVER,withTemporarySiteGeometry}
 from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';

const newWorld=seed=>newSession(0,seed,'full-view','small');

test('Stage 12: two missions own independent geometry and playable bounds',()=>{
 try{
  const a=newWorld(7),wa=sessionWorldGeometry(a);
  const walls=JSON.stringify(wa.walls),cover=JSON.stringify(wa.cover);
  const b=newWorld(19),wb=sessionWorldGeometry(b);
  assert.notEqual(wa,wb);
  assert.notStrictEqual(wa.cover,wb.cover);
  assert.strictEqual(wa.cover,a.coverState);
  assert.strictEqual(wb.cover,b.coverState);
  assert.equal(JSON.stringify(wa.walls),walls);
  assert.equal(JSON.stringify(wa.cover),cover);
  assert.notStrictEqual(wa.walls,WALLS);
  assert.notStrictEqual(wa.cover,COVER);
  assert.deepEqual(wa.bounds,a.site.bounds);
  assert.deepEqual(wb.bounds,b.site.bounds);
  assert.notStrictEqual(wa.walls,wb.walls);
 }finally{activateSite(null);}
});

test('Stage 12: private passability and wall rays ignore active site switches',()=>{
 try{
  const a=newWorld(7),wa=sessionWorldGeometry(a);
  const at={...a.site.spawn[0]},target={...a.site.entrance};
  const before=[wa.passable(at),wa.staticWallBlocksRay({a:at,b:target})];
  const rev=wa.revision;
  const b=newWorld(19),wb=sessionWorldGeometry(b);
  assert.deepEqual([wa.passable(at),
   wa.staticWallBlocksRay({a:at,b:target})],before);
  assert.equal(wa.revision,rev);
  assert.equal(wa.route(at,at).length>=0,true);
  assert.deepEqual(wa.route(at,at),wa.route(at,at));
  assert.notStrictEqual(wb,wa);
  // An auditor borrowing the legacy adapter can never change authoritative
  // passability, local revision or the source session's furniture inventory.
  withTemporarySiteGeometry(b.site,()=>{
   assert.deepEqual([wa.passable(at),
    wa.staticWallBlocksRay({a:at,b:target})],before);
   assert.equal(wa.revision,rev);
  });
 }finally{activateSite(null);}
});

test('Stage 12: moving furniture invalidates only its own session index',()=>{
 try{
  const a=newWorld(7),b=newWorld(19);
  const wa=sessionWorldGeometry(a),wb=sessionWorldGeometry(b);
  assert.ok(a.coverState.length>0);
  const cover=a.coverState[0],beforeB=wb.revision,beforeA=wa.revision;
  const old={x:cover.x,y:cover.y};
  cover.x+=90;cover.y+=90;a.objectRevision++;
  assert.equal(wa.cover[0].x,old.x+90);
  assert.ok(wa.revision>beforeA);
  assert.equal(wb.revision,beforeB);
  const check={x:cover.x,y:cover.y};
  assert.equal(wa.someCoverNearPoint(check,1,o=>o===cover),true);
  assert.equal(wa.someCoverNearPoint(old,1,o=>o===cover),false);
  assert.equal(wb.revision,beforeB);
 }finally{activateSite(null);}
});

test('Stage 12: authoritative world module cannot mutate global activation',()=>{
 const code=readFileSync(new URL('../src/breach-world-context.ts',import.meta.url),'utf8');
 assert.doesNotMatch(code,/\bactivateSite\s*\(/);
 assert.doesNotMatch(code,/\bCOVER\.splice\s*\(/);
 assert.doesNotMatch(code,/\bstepSession\s*\(/);
 assert.doesNotMatch(code,/Math\.random\s*\(/);
 assert.match(code,/new WeakMap<Session,SessionWorldGeometry>/);
});
