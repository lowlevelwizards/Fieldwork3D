import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,enemies} from '../src/breach-game.ts';
import {reconcileEnemyIntent} from '../src/breach-ai-reconciliation.ts';
import {newAwareness,addObservation,bestBelief} from '../src/breach-awareness.ts';
import {createEnemyDecisionController} from '../src/breach-enemy-decision-controller.ts';

const point=(x,y)=>({x,y});
test('EA1 active search destination is not reset by old contact evidence',()=>{
 const s=newSession(),a=enemies(s)[0];
 assert.ok(a);s.seconds=10;
 a.awareness=newAwareness();
 addObservation(a.awareness,{id:'old',observerId:a.id,source:'visual',
  subjectId:'observed',kind:'contact',at:8,estimate:point(10,20),uncertainty:0});
 a.alert='investigating';a.searchOrigin=point(10,20);
 a.contact=point(45,55);a.searchQueue=[point(75,85)];
 reconcileEnemyIntent(s,a,0);
 assert.deepEqual(a.contact,point(45,55));
 assert.deepEqual(a.searchQueue,[point(75,85)]);
 a.searchOrigin=null;
 reconcileEnemyIntent(s,a,0);
 assert.deepEqual(a.contact,point(10,20));
});

test('EA1 only eligible group members receive a semantic warning task',()=>{
 const s=newSession(),sender=enemies(s)[0];assert.ok(sender);
 s.seconds=10;sender.encounterGroupId='ea-group';
 const make=(id,group,surrendered=false)=>({...sender,id,encounterGroupId:group,
  surrendered,health:2,awareness:newAwareness(),suspicion:structuredClone(sender.suspicion),
  contact:null,heard:null,alert:'idle',intent:null,nav:[],
  coordinationRole:null,coordinationUntil:0,searchOrigin:point(1,1),
  searchQueue:[point(2,2)],searchPauseUntil:12});
 const member=make('ea-member','ea-group');
 const other=make('ea-other','other-group');
 const captive=make('ea-captive','ea-group',true);
 const roster=[sender,member,other,captive];
 const controller=createEnemyDecisionController({
  approach:()=>{},cachedEnemyRoute:()=>[],requestClearFireStep:()=>false,
  inSight:()=>false,enemies:()=>roster,hear:()=>{},notify:()=>{},battleEvent:()=>{}
 });
 const report={id:900,senderId:sender.id,at:10,origin:{...sender.p},
  estimate:point(sender.p.x+25,sender.p.y),uncertainty:35,deliveredTo:[]};
 s.reports=[report];controller.distributeReports(s);
 assert.deepEqual(report.deliveredTo,[member.id]);
 assert.equal(member.coordinationRole,'investigate');
 assert.equal(member.searchOrigin,null);
 assert.deepEqual(member.searchQueue,[]);
 assert.equal(other.awareness.observations.length,0);
 assert.equal(captive.awareness.observations.length,0);
});

test('EA2 single-pass belief selection matches stable sorted reference',()=>{
 const m=newAwareness();
 for(let i=0;i<40;i++){
  const c={id:'c'+i,estimate:point(i,i),lastAt:i%5,lastSeenAt:null,
   confidence:(i%7)/6,uncertainty:30,source:'reported'};
  m.contacts[c.id]=c;
  const reference=Object.values(m.contacts).filter(x=>x.confidence>.1)
   .sort((a,b)=>b.confidence-a.confidence||b.lastAt-a.lastAt)[0]??null;
  assert.equal(bestBelief(m),reference);
 }
 assert.equal(bestBelief(newAwareness()),null);
});
