import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PERSON_CONTACT_STANDOFF,PERSON_CONTACT_OFFSETS,
 contactStandpointAtRadius} from '../src/breach-person-contact-standpoint.ts';
import {PHYSICAL_CONTACT_PROFILES,resolvePhysicalContactEpisode,
 advancePhysicalContactTime}
 from '../src/breach-physical-contact-episode.ts';

const pt=(x,y)=>({x,y});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const facts=(action,range,overrides={})=>({
 action,from:pt(0,0),target:pt(range,0),authoredAt:pt(range,0),
 targetVisible:true,handLaneClear:true,canStand:()=>true,...overrides
});

test('R6.2 profiles keep real GO hand reach and distinct short staging bands',()=>{
 assert.deepEqual(Object.keys(PHYSICAL_CONTACT_PROFILES).sort(),[
  'restrain-civilian','restrain-suspect','search-suspect',
  'secure-civilian','secure-firearm'
 ]);
 assert.deepEqual([
  PHYSICAL_CONTACT_PROFILES['restrain-suspect'].handReach,
  PHYSICAL_CONTACT_PROFILES['search-suspect'].handReach,
  PHYSICAL_CONTACT_PROFILES['secure-firearm'].handReach
 ],[42,28,34]);
 assert.deepEqual([
  PHYSICAL_CONTACT_PROFILES['restrain-suspect'].approachLimit,
  PHYSICAL_CONTACT_PROFILES['search-suspect'].approachLimit,
  PHYSICAL_CONTACT_PROFILES['secure-firearm'].approachLimit
 ],[45,45,58]);
 assert.equal(PHYSICAL_CONTACT_PROFILES['restrain-civilian'].standOff,39);
 assert.equal(PERSON_CONTACT_STANDOFF,39);
});

test('R6.2 actual within-reach, exact edge, and prohibited beyond-stage cases',()=>{
 for(const [action,reach,limit] of [
  ['restrain-suspect',42,45],['secure-civilian',42,45],
  ['restrain-civilian',42,45],['search-suspect',28,45],
  ['secure-firearm',34,58]
 ]){
  assert.equal(resolvePhysicalContactEpisode(facts(action,reach)).kind,'ready',action);
  assert.equal(resolvePhysicalContactEpisode(facts(action,reach+0.001)).kind,
   'approach',action+' near gap');
  assert.equal(resolvePhysicalContactEpisode(facts(action,limit)).kind,
   'approach',action+' upper bound');
  const beyond=resolvePhysicalContactEpisode(facts(action,limit+0.001));
  assert.equal(beyond.kind,'blocked',action);
  assert.equal(beyond.reason,'out-of-approach',action);
 }
});

test('R6.2 person and search stages cannot name target occupied center',()=>{
 const center=pt(44,0);
 const first=resolvePhysicalContactEpisode(facts('restrain-suspect',44));
 assert.equal(first.kind,'approach');
 assert.ok(Math.abs(dist(first.goal,center)-39)<1e-6);
 assert.ok(dist(first.goal,center)>36);
 const search=resolvePhysicalContactEpisode(facts('search-suspect',34));
 assert.equal(search.kind,'approach');
 assert.ok(Math.abs(dist(search.goal,pt(34,0))-25)<1e-6);
 assert.ok(dist(search.goal,pt(34,0))>=2*8,
  'subject and 8-unit operator cannot occupy the same capsule');
 assert.notDeepEqual(search.goal,pt(34,0));
 const gun=resolvePhysicalContactEpisode(facts('secure-firearm',55));
 assert.equal(gun.kind,'approach');
 assert.ok(Math.abs(dist(gun.goal,pt(55,0))-25)<1e-6);
});

test('R6.2 free side candidate is chosen in deterministic angular order',()=>{
 const b=facts('search-suspect',34,{
  canStand:p=>Math.abs(p.y)>12
 });
 const s=resolvePhysicalContactEpisode(b);
 assert.equal(s.kind,'approach');
 assert.ok(s.goal.y< -12,'positive angular offset is first alternate behind the direct slot');
 const c=resolvePhysicalContactEpisode({...b,canStand:()=>false});
 assert.deepEqual({kind:c.kind,reason:c.reason},
  {kind:'blocked',reason:'no-standpoint'});
 const person=contactStandpointAtRadius(pt(0,0),pt(44,0),
  PERSON_CONTACT_STANDOFF,PERSON_CONTACT_OFFSETS,p=>Math.abs(p.y)>9);
 assert.ok(person&&Math.abs(dist(person,pt(44,0))-39)<1e-6);
 const other=contactStandpointAtRadius(pt(0,0),pt(44,0),25,[0,.52,-.52],
  p=>Math.abs(p.y)>12);
 assert.ok(other&&Math.abs(dist(other,pt(44,0))-25)<1e-6);
});

test('R6.2 no disclosure, stale anchor, blocked hand lane, or invalid geometry can stage',()=>{
 for(const [input,reason] of [
  [facts('search-suspect',34,{targetVisible:false}),'unobserved'],
  [facts('restrain-civilian',44,{authoredAt:pt(300,300)}),'stale-target'],
  [facts('restrain-suspect',40,{handLaneClear:false}),'contact-obstructed'],
  [facts('secure-firearm',45,{handLaneClear:false}),'contact-obstructed'],
  [facts('secure-firearm',NaN),'invalid-geometry'],
  [facts('restrain-suspect',44,{from:pt(Infinity,0)}),'invalid-geometry']
 ]){
  const verdict=resolvePhysicalContactEpisode(input);
  assert.equal(verdict.kind,'blocked');
  assert.equal(verdict.reason,reason);
 }
 // A target already within real reach does not need new target disclosure,
 // consistent with the original GO executor and the R6.1 outcome contract.
 assert.equal(resolvePhysicalContactEpisode(facts('restrain-suspect',40,
  {targetVisible:false})).kind,'ready');
});

test('R6.2 contact progression is pure, fixed-clock, and never a remote commit',()=>{
 const duration=.9,dt=1/60;
 let elapsed=0;
 for(let i=0;i<53;i++){
  const state=advancePhysicalContactTime(elapsed,dt,duration);
  elapsed=state.elapsed;
  assert.equal(state.complete,false);
 }
 const state=advancePhysicalContactTime(elapsed,dt,duration);
 assert.equal(state.complete,true);
 assert.ok(state.elapsed>=duration);
 assert.deepEqual(advancePhysicalContactTime(0,.75,.75),
  {elapsed:.75,complete:true});
 for(const dt of [0,-1,NaN,Infinity])
  assert.throws(()=>advancePhysicalContactTime(0,dt,1),RangeError);
 for(const bad of [0,-1,NaN,Infinity])
  assert.throws(()=>advancePhysicalContactTime(0,1/60,bad),RangeError);
 assert.throws(()=>advancePhysicalContactTime(NaN,1/60,1),RangeError);
});

test('R6.2 one physical motor and authoritative completion retained in GO owner',()=>{
 const root=new URL('../src/',import.meta.url);
 const source=readFileSync(new URL('breach-order-interactions.ts',root),'utf8');
 assert.match(source,/resolvePhysicalContactEpisode/);
 assert.match(source,/advancePhysicalContactTime/);
 assert.match(source,/approach\(a,contact\.goal,dt,s,\.65\)/);
 assert.doesNotMatch(source,/approach\(a,suspect\.p,dt,s,\.65\)/);
 assert.doesNotMatch(source,/approach\(a,person\.p,dt,s,\.65\)/);
 assert.match(source,/sweptBodyClear\(a\.p,p,s\.doors,OPERATOR_RADIUS,world\)/);
 assert.match(source,/completeOrder/);
 const policy=readFileSync(new URL('breach-physical-contact-episode.ts',root),
  'utf8');
 assert.doesNotMatch(policy,/from ['"].*breach-(?:game|navigation|actor-motor|world-context|replay)/);
 assert.doesNotMatch(policy,/\b(?:setTimeout|setInterval|Date\.now|Math\.random|document\.)/);
});
