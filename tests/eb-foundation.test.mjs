import test from 'node:test';import assert from 'node:assert/strict';
import {AI_GROUP_KINDS,AI_GROUP_PROFILES,AI_COMPETENCE} from '../src/breach-ai-group-profiles.ts';
import {npcIdentity,npcGroupKind} from '../src/breach-ai-identity.ts';
import {doctrineForGroup} from '../src/breach-ai-doctrine.ts';
test('EB1 catalog exhaustively defines all identities and valid competence distributions',()=>{
 assert.equal(AI_GROUP_KINDS.length,7);assert.equal(AI_COMPETENCE.length,4);
 for(const kind of AI_GROUP_KINDS){
  const p=AI_GROUP_PROFILES[kind];assert.ok(p.label&&p.motivation);
  const [a,b,c]=p.competenceCutoffs;assert.ok(0<=a&&a<=b&&b<=c&&c<=1);
  assert.equal(doctrineForGroup(kind),p.doctrine);
  const identity=npcIdentity(41,'actor','occupants','occupant','routine',kind);
  assert.deepEqual(identity,npcIdentity(41,'actor','occupants','occupant','routine',kind));
  assert.equal(identity.groupKind,kind);assert.equal(identity.motivation,p.motivation);
  for(const tier of AI_COMPETENCE)assert.equal(npcIdentity(41,'actor',undefined,undefined,undefined,kind,tier).competence,tier);
  assert.equal(npcIdentity(41,'actor','occupants','target','routine',kind).motivation,'avoid-capture');
 }
 assert.equal(npcGroupKind('organised','defensive'),'armed-irregulars');
 assert.equal(doctrineForGroup('regular-force'),'organised');
});

import {npcPressurePolicy} from '../src/breach-ai-pressure-policy.ts';
import {attemptNpcWithdrawal} from '../src/breach-ai-task-state.ts';
import {newSession,enemies} from '../src/breach-game.ts';
test('EB2 shared withdrawal owner prevents duplicate shelter work and retains existing retries',()=>{
 const a=enemies(newSession())[0];let calls=0;
 const shelter=()=>{calls++;return null;};
 assert.equal(attemptNpcWithdrawal(a,1,shelter,11,true),'unavailable');
 assert.equal(a.alert,'cover');assert.equal(attemptNpcWithdrawal(a,1.2,shelter),'deferred');assert.equal(calls,1);
 assert.equal(attemptNpcWithdrawal(a,3,()=>({x:a.p.x+30,y:a.p.y}),11,true),'committed');
 assert.equal(a.alert,'retreat');assert.equal(attemptNpcWithdrawal(a,4,shelter),'deferred');
 assert.equal(calls,1);
 assert.ok(npcPressurePolicy('cautious').contactWithdraw<npcPressurePolicy('aggressor').contactWithdraw);
});

import {aiSiteIndex,connectedAreaCenters} from '../src/breach-ai-site-index.ts';
test('EB3 cache ignores leaf motion but catches in-place threshold edits and new geometry',()=>{
 const site={rooms:[{id:'a',kind:'room',x:0,y:0,w:100,h:100},{id:'b',kind:'room',x:100,y:0,w:100,h:100}]};
 const world={site,cover:[],revision:0};
 const doors=[{id:'a-b',a:{x:100,y:30},b:{x:100,y:70},open:false}];
 const first=aiSiteIndex(world,doors);
 assert.deepEqual(connectedAreaCenters(first,{x:50,y:50}),[{x:150,y:50}]);
 doors[0].open=true;assert.equal(aiSiteIndex(world,doors),first);
 doors[0].a.y=35;const changed=aiSiteIndex(world,doors);assert.notEqual(changed,first);
 world.revision++;assert.notEqual(aiSiteIndex(world,doors),changed);
});

import {AiWorkScheduler} from '../src/breach-ai-work-scheduler.ts';
test('EB4 a scheduled actor cannot chain elective jobs on the same tick, urgent work bypasses',()=>{
 const ids=Array.from({length:32},(_,i)=>'eb'+i),work=new AiWorkScheduler(2,ids),seen=new Set();
 for(let tick=0;tick<32;tick++){
  let admitted=0;
  for(const id of ids)if(work.allow(id,'investigation-route',tick)){
   seen.add(id);admitted++;
   assert.equal(work.allow(id,'idle-route',tick),false);
   assert.equal(work.allow(id,'emergency',tick,true),true);
  }
  assert.ok(admitted<=2);
 }
 assert.equal(seen.size,32);assert.ok(work.maxUnitsObserved<=work.maxUnitsPerTick);
});
