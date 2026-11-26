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

import {probeInvestigationRoute,reachableInvestigation} from '../src/breach-defense.ts';
test('EA1 exhausted evidence remains recorded but fresh lower-confidence evidence can reopen an investigation',()=>{
 const s=newSession(),a=enemies(s)[0];s.seconds=10;
 a.awareness=newAwareness();
 addObservation(a.awareness,{id:'old',observerId:a.id,source:'visual',
  subjectId:'old',kind:'contact',at:7,estimate:point(20,20),uncertainty:0});
 a.suspicion.searchExhaustedAt=9;a.contact=null;a.heard=null;a.lastNoiseAt=8;
 a.alert='cover';a.contacted=true;
 reconcileEnemyIntent(s,a,0);
 assert.equal(a.contact,null);assert.equal(bestBelief(a.awareness).id,'old');
 addObservation(a.awareness,{id:'new',observerId:a.id,source:'reported',
  subjectId:'new',kind:'contact',at:9.5,estimate:point(40,40),uncertainty:35});
 reconcileEnemyIntent(s,a,0);
 assert.deepEqual(a.contact,point(40,40));
});
test('EA2 resumed candidate search is deterministic, bounded and reuses the accepted route',()=>{
 const origin=point(0,0),target=point(100,100),calls=[];
 const route=(from,to)=>{calls.push({...to});return calls.length===13?[{...from},{...to}]:[];};
 let cursor=0,result;
 do{
   const before=calls.length;
   result=probeInvestigationRoute(origin,target,cursor,4,route,()=>true);
   assert.ok(calls.length-before<=4);
   if(result.kind==='pending')cursor=result.cursor;
 }while(result.kind==='pending');
 assert.equal(result.kind,'found');assert.equal(calls.length,13);
 assert.deepEqual(result.route.at(-1),result.point);
 let synchronous=0;
 assert.deepEqual(reachableInvestigation(origin,target,(_a,b)=>++synchronous===13?[b]:[],()=>true),result.point);
 assert.equal(probeInvestigationRoute(origin,target,0,4,()=>{throw Error('invalid point routed');},()=>false).kind,'exhausted');
});

import {buildAiSiteIndex,aiSiteIndex,connectedAreaCenters} from '../src/breach-ai-site-index.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {searchCandidates} from '../src/breach-ai-search.ts';
test('EA3 semantic anchors are session/revision scoped; window is not a walkable edge',()=>{
 const rooms=[{id:'a',kind:'room',x:0,y:0,w:100,h:100},{id:'b',kind:'room',x:100,y:0,w:100,h:100},{id:'c',kind:'room',x:0,y:100,w:100,h:100}];
 const door={id:'d',a:point(100,30),b:point(100,70)};
 const index=buildAiSiteIndex({rooms,windows:[{id:'w',x:50,y:100,width:30,vertical:false}]},[],[door]);
 assert.deepEqual(connectedAreaCenters(index,point(50,50)),[point(150,50)]);
 assert.equal(index.portals.find(x=>x.id==='w').kind,'window');
 const s=newSession(),world=sessionWorldGeometry(s);
 const before=aiSiteIndex(world,s.doors);
 assert.equal(aiSiteIndex(world,s.doors),before);
 world.invalidate();
 assert.notEqual(aiSiteIndex(world,s.doors),before);
 assert.notEqual(aiSiteIndex(sessionWorldGeometry(newSession()),s.doors),before);
});
test('EA7 local search is not starved by distant earlier fixtures or doors',()=>{
 const room={id:'local',kind:'room',x:0,y:0,w:200,h:200};
 const far=Array.from({length:60},(_,i)=>({x:1000+i*10,y:1000,w:20,h:20}));
 const near={x:100,y:100,w:20,h:20};
 const result=searchCandidates(point(100,100),45,[room],[],[...far,near]);
 assert.ok(result.some(p=>Math.abs(p.x-100)===29||Math.abs(p.y-100)===29));
 assert.deepEqual(result,searchCandidates(point(100,100),45,[room],[],[near,...far]));
});
