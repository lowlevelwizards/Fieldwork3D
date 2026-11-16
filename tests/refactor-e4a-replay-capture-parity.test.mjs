import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,isDetected,personDetected,inSight,
 liveVisibility,observerPointVisible} from '../src/breach-game.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {captureReplayKnowledge} from '../src/breach-replay-visibility.ts';
import {snapshot,MissionRecorder} from '../src/breach-replay.ts';

/** Frozen reference to the old capture ordering, for exact evidence parity.
 * No renderer or replay playback function is allowed to retest live LOS.
 */
function previousCapture(s,previouslyDiscovered=new Set(),
 observerBodies=new Map()){
 const visibleActorIds=[],visibleCivilianIds=[];
 const discovered=new Set(previouslyDiscovered);
 const operatorVisibleActorIds={},operatorDetectedActorIds={};
 const operatorVisibleCivilianIds={},operatorVisibleBodyIds={};
 const operatorDiscoveredBodyIds={};
 const bodies=s.operators.filter(a=>a.side!=='blue'&&a.health<=0);
 const blue=s.operators.filter(a=>a.side==='blue');
 const livingHostiles=s.operators.filter(a=>a.side!=='blue'&&a.health>0);
 for(const observer of blue){
  operatorDetectedActorIds[observer.id]=observer.health>0?
   livingHostiles.filter(target=>personDetected(observer,target,s))
    .map(target=>target.id):[];
  operatorVisibleActorIds[observer.id]=observer.health>0?
   livingHostiles.filter(target=>inSight(observer,target,s))
    .map(target=>target.id):[];
  operatorVisibleCivilianIds[observer.id]=observer.health>0?
   s.civilians.filter(c=>observerPointVisible(s,observer,c.p))
    .map(c=>c.id):[];
  const visibleBodies=observer.health>0?
   bodies.filter(body=>observerPointVisible(s,observer,body.p))
    .map(body=>body.id):[];
  operatorVisibleBodyIds[observer.id]=visibleBodies;
  let seen=observerBodies.get(observer.id);
  if(!seen){seen=new Set();observerBodies.set(observer.id,seen);}
  for(const id of visibleBodies)seen.add(id);
  operatorDiscoveredBodyIds[observer.id]=[...seen];
 }
 for(const a of s.operators){
  const visible=a.side==='blue'||(a.health>0?
   isDetected(s,a):liveVisibility(s,a.p));
  if(visible)visibleActorIds.push(a.id);
  if(a.health<=0&&visible)discovered.add(a.id);
 }
 for(const c of s.civilians)
  if(liveVisibility(s,c.p))visibleCivilianIds.push(c.id);
 return {visibleActorIds,visibleCivilianIds,
  discoveredBodyIds:[...discovered],operatorVisibleActorIds,
  operatorDetectedActorIds,operatorVisibleCivilianIds,
  operatorVisibleBodyIds,operatorDiscoveredBodyIds};
}

test('E4.A observer sight captures remain byte-equivalent to ordered historical evidence',()=>{
 for(const seed of [7,3411]){
  for(const mode of ['full-view','true-blind','floor-plan']){
   const s=newSession(0,seed,mode,'small');
   const blue=s.operators.find(a=>a.side==='blue');
   const red=s.operators.find(a=>a.side!=='blue');
   assert.ok(blue&&red);
   s.civilians.push(createCivilian({id:'e4a-civ-'+seed,
    role:'visitor',persona:'steady',activity:'idle',
    position:{...blue.p},heading:0,roomId:'test',
    appearanceSeed:seed}));
   // Seeded, distinct observer positions and a visible corpse exercise
   // discovered-body persistence without team/personal truth conflation.
   for(const hostileHealth of [2,0,Number.NaN]){
    red.health=hostileHealth;
    if(hostileHealth===0)red.p={...blue.p};
    for(const unconscious of [false,true]){
     blue.health=unconscious?0:2;
     const beforeSeen=new Set(['older-body']);
     const afterSeen=new Set(['older-body']);
     const beforeObserver=new Map([[blue.id,new Set(['known-body'])]]);
     const afterObserver=new Map([[blue.id,new Set(['known-body'])]]);
     const expected=previousCapture(s,beforeSeen,beforeObserver);
     const actual=captureReplayKnowledge(s,afterSeen,afterObserver);
     assert.deepEqual(actual,expected,
      'seed '+seed+' mode '+mode+' hostileHealth '+hostileHealth+' down '+unconscious);
     assert.deepEqual([...afterObserver].map(([id,ids])=>[id,[...ids]]),
      [...beforeObserver].map(([id,ids])=>[id,[...ids]]));
    }
   }
  }
 }
});

test('E4.A frame civilian visibility uses only recorded knowledge, with stable history',()=>{
 const s=newSession(0,3411,'full-view','small');
 const ally=s.operators.find(a=>a.side==='blue');
 assert.ok(ally);
 const civ=createCivilian({id:'e4a-proof',
  role:'visitor',persona:'steady',activity:'idle',
  position:{...ally.p},heading:0,roomId:'test',appearanceSeed:5});
 s.civilians.push(civ);
 const film=new MissionRecorder();
 film.capture(s,true);
 assert.ok(film.frames.length);
 const first=film.frames[0];
 for(const c of first.civilians){
  assert.equal(c.visibleAtCapture,
   first.knowledge.visibleCivilianIds.includes(c.id),
   'recorded civilian evidence must not borrow future LOS');
 }
 s.intel.mode='true-blind';
 s.seconds=.05;civ.p={x:-10000,y:-10000};
 film.capture(s,true);
 const second=film.frames.at(-1);
 assert.ok(second&&second!==first);
 for(const c of second.civilians)
  assert.equal(c.visibleAtCapture,second.knowledge.visibleCivilianIds.includes(c.id));
 assert.equal(first.civilians.find(c=>c.id===civ.id).p.x,ally.p.x,
  'historical positions must remain immutable');
 assert.notEqual(second.civilians.find(c=>c.id===civ.id).p.x,ally.p.x);
 // A new capture may not mutate a prior frame's recorded visibility.
 assert.equal(first.civilians.find(c=>c.id===civ.id).visibleAtCapture,true);
 assert.equal(second.civilians.find(c=>c.id===civ.id).visibleAtCapture,false);
 const direct=snapshot(s,undefined,undefined,undefined,undefined,first.actors);
 assert.deepEqual(direct.actors.map(a=>a.id),first.actors.map(a=>a.id));
});
