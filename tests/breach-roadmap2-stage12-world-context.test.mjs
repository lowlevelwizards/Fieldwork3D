import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,toggling,stepSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {intelPassable} from '../src/breach-intel.ts';
import {strikeSurface} from '../src/breach-ballistic-resolution.ts';
import {cachedHingeSweepNeighborhood} from '../src/breach-door.ts';
import {activateSite,WALLS,COVER,withTemporarySiteGeometry}
 from '../src/breach-core.ts';
import {sessionWorldGeometry,publishSessionCoverToActiveSite,
 setPresentationWorldSession} from '../src/breach-world-context.ts';

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
 const presentation=readFileSync(new URL(
   '../src/breach-presentation-world-ownership.ts',import.meta.url),'utf8');
 assert.match(presentation,/if\(presentationSession!==s\|\|/);
 assert.match(presentation,/export function publishSessionCoverToActiveSite/);
 assert.match(code,/export \{setPresentationWorldSession,adoptPresentationWorldSession,/);
 assert.doesNotMatch(code,/\bstepSession\s*\(/);
 assert.doesNotMatch(code,/Math\.random\s*\(/);
 assert.match(code,/new WeakMap<Session,SessionWorldGeometry>/);
});

test('Stage 12: shot traces and hinge neighborhoods use their owning world',()=>{
 try{
  const a=newWorld(7),w=sessionWorldGeometry(a);
  const shotFrom={...a.site.spawn[0]},shotTo={...a.site.entrance};
  const before=strikeSurface(shotFrom,shotTo,a,22,22,.5);
  const door=a.doors[0];
  const hinge=door?cachedHingeSweepNeighborhood(door,w):null;
  const walls=hinge?.walls.map(z=>({...z}))??[];
  const b=newWorld(19);
  assert.deepEqual(strikeSurface(shotFrom,shotTo,a,22,22,.5),before);
  if(door){
   assert.strictEqual(cachedHingeSweepNeighborhood(door,w),hinge,
    'other site activation must not invalidate this session hinge cache');
   assert.deepEqual(hinge.walls,walls);
  }
  assert.notStrictEqual(sessionWorldGeometry(b),w);
 }finally{activateSite(null);}
});

test('Stage 12: replay seek restores cover within its Session, not a competing game',()=>{
 try{
  const a=newWorld(7),wa=sessionWorldGeometry(a);
  const frame=snapshot(a);
  const b=newWorld(19),wb=sessionWorldGeometry(b);
  const activeCover=JSON.stringify(COVER),otherCover=JSON.stringify(b.coverState);
  a.coverState[0].x+=20;a.objectRevision++;
  assert.ok(wa.revision>0);
  applyReplayFrame(a,frame);
  assert.strictEqual(wa.cover,a.coverState,
   'replay replacement must preserve the indexed authoritative array identity');
  assert.deepEqual(wa.cover,frame.coverState);
  assert.equal(JSON.stringify(b.coverState),otherCover);
  assert.equal(JSON.stringify(COVER),activeCover,
   'background replay seek cannot overwrite the active mission cover');
  assert.equal(wb.revision,0);
  assert.equal(intelPassable(a.site.spawn[0],a.intel),
   intelPassable(a.site.spawn[0],a.intel,8,wa));
 }finally{activateSite(null);}
});

test('Stage 12: fixed-step outcomes of live mission are unaffected by another active site',()=>{
 const signature=s=>({
  phase:s.phase,mission:s.mission,seconds:Number(s.seconds.toFixed(5)),
  objectRevision:s.objectRevision,rng:s.rng,
  actors:s.operators.map(a=>({
   id:a.id,p:{x:Number(a.p.x.toFixed(4)),y:Number(a.p.y.toFixed(4))},
   health:a.health,shots:a.shots,magazine:a.magazine,alert:a.alert,
   nav:a.nav.map(p=>({x:Number(p.x.toFixed(3)),y:Number(p.y.toFixed(3))}))
  })),
  doors:s.doors.map(d=>({id:d.id,open:d.open,
   fraction:Number((d.openFraction??0).toFixed(5))})),
  cover:s.coverState.map(o=>({x:o.x,y:o.y,toppled:o.toppled,
   integrity:o.integrity})),
  events:s.battleEvents.map(x=>({kind:x.kind,actor:x.actor,t:x.t}))
 });
 const run=(interleave)=>{
  const a=newWorld(7);
  toggling(a);
  const b=interleave?newWorld(19):null;
  if(b)toggling(b);
  for(let i=0;i<100;i++){
   stepSession(a,1/60);
   if(b)stepSession(b,1/60);
  }
  return signature(a);
 };
 try{assert.deepEqual(run(true),run(false));}
 finally{activateSite(null);}
});

test('Stage 12: same Site shared by two sessions never aliases visual publication',()=>{
 try{
  const a=newWorld(7);
  const b=newSession(0,undefined,'full-view','small','hold',a.site);
  assert.strictEqual(a.site,b.site);
  const published=JSON.stringify(COVER);
  const first=a.coverState[0];
  first.x+=25;a.objectRevision++;
  publishSessionCoverToActiveSite(a);
  assert.equal(JSON.stringify(COVER),published,
   'background Session must not publish even if site identity matches');
  setPresentationWorldSession(a);
  activateSite(a.site);
  publishSessionCoverToActiveSite(a);
  assert.equal(COVER[0].x,first.x);
  assert.notEqual(b.coverState[0].x,first.x);
 }finally{activateSite(null);}
});
