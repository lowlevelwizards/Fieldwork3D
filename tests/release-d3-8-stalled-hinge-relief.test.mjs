import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team} from '../src/breach-game.ts';
import {selfBlockingHingeRelief} from '../src/breach-door-traversal-maneuver.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
import {doorWouldStrikeActors} from '../src/breach-door.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {activateSite,OPERATOR_RADIUS} from '../src/breach-core.ts';

const p=(x,y)=>({x,y});
test('D3.8 warehouse 31123: existing self-clearance offers actual swept legal exit from body-stalled leaf',()=>{
 const seed=31123,site=generateSite(seed,'small',undefined,
  {mission:'intel'},{archetype:'warehouse'});
 const s=newSession(0,seed,'full-view',site.scale??'small','intel',
  {...site,training:true,enemies:[],encounter:undefined},
  {enableCivilians:false});
 try{
  const actors=team(s).slice(0,4);
  assert.equal(actors.length,4);
  const locations=[p(405.90749,462.57355),p(408.75047,458.02663),
   p(410.68475,456.0039),p(412.65813,452.05449)];
  const goals=[p(150.8,237.5),p(201.2,237.5),
   p(150.8,369.5),p(150.8,482)];
  for(let i=0;i<4;i++)actors[i].p=locations[i];
  const door=s.doors.find(d=>d.id==='FRONT');
  assert.ok(door,'exact generated warehouse front hinge exists');
  door.open=true;door.openFraction=.397;door.pushTarget=1.55;
  door.angularVelocity=0;
  const world=sessionWorldGeometry(s);
  assert.ok(doorWouldStrikeActors(
   door,.422,actors.map(a=>a.p),OPERATOR_RADIUS),
   'live bodies together obstruct the next hinge sweep');
  let found=0;
  for(let i=0;i<4;i++){
   const actor=actors[i],relief=selfBlockingHingeRelief(actor,s,goals[i]);
   if(!relief)continue;
   assert.ok(sweptBodyClear(actor.p,relief,s.doors,OPERATOR_RADIUS,world));
   assert.ok(Math.hypot(relief.x-actor.p.x,relief.y-actor.p.y)<=32.01);
   assert.ok(actors.every(peer=>peer===actor||
    Math.hypot(relief.x-peer.p.x,relief.y-peer.p.y)>=2*OPERATOR_RADIUS+1));
   found++;
  }
  assert.ok(found>=1,
   'at least one obstructing actor can retreat legally without a second mover');
 }finally{activateSite(null);}
});
test('D3.8 cold hinge handoff has a bounded episode retry and never bypasses collision',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../src/breach-motor-door.ts',
  import.meta.url),'utf8');
 // D3.9 consolidates the earlier separate D3.8 retry into the same
 // bounded opener/follower clearance ownership, without two nav writers.
 assert.match(source,/ownerRelief/);
 assert.match(source,/staged\.attempts<5/);
 assert.match(source,/selfBlockingHingeRelief\(a,s,p\)/);
 assert.match(source,/a\.nav\.unshift\(retreat\)/);
 assert.doesNotMatch(source,/episode\.maneuverAttempts<6/);
});
