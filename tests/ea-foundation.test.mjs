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

import {npcIdentity} from '../src/breach-ai-identity.ts';
import {routineDwellSeconds} from '../src/breach-ai-routine-dwell.ts';
import {investigationTempo} from '../src/breach-ai-investigation.ts';
test('EA5 identities are deterministic, independent of appearance and separate from purpose',()=>{
 const all=['untrained','experienced','trained','specialist'];
 const occupants=Array.from({length:200},(_,i)=>npcIdentity(12,'npc'+i,'occupants','occupant'));
 const organised=Array.from({length:200},(_,i)=>npcIdentity(12,'npc'+i,'organised','occupant'));
 assert.ok(organised.filter(x=>all.indexOf(x.competence)>=2).length>occupants.filter(x=>all.indexOf(x.competence)>=2).length);
 assert.ok(organised.some(x=>x.competence==='specialist'));
 assert.deepEqual(organised[0],npcIdentity(12,'npc0','organised','occupant'));
 assert.equal(npcIdentity(12,'npc0','organised','target').motivation,'avoid-capture');
 assert.ok(organised.every(x=>x.patience>=0&&x.patience<=1));
});
test('EA5 personality changes ambient assessment and dwell without changing awareness',()=>{
 const identity=npcIdentity(5,'a','security','patrol');
 const quick={...identity,composure:1,patience:0},slow={...identity,composure:0,patience:1};
 assert.ok(investigationTempo('guard',65,quick).orientSeconds<investigationTempo('guard',65,slow).orientSeconds);
 assert.ok(routineDwellSeconds('a','patrolling',0,0,0)<routineDwellSeconds('a','patrolling',0,0,1));
});

import {commitNpcWithdrawal,clearNpcTasks} from '../src/breach-ai-task-state.ts';
import {coverScore} from '../src/breach-defense-scoring.ts';
import {countNearbyEnemyAllies} from '../src/breach-ai-morale.ts';
test('EA4 a shelter goal values protection even if the NPC cannot fire from it',()=>{
 const q={protected:true,shotClear:false,travel:30,range:80,allyConflict:false,nearDoor:false,approachExposed:false};
 assert.ok(coverScore(q,'shelter')>coverScore({...q,protected:false,shotClear:true},'shelter'));
});
test('EA1/EA10 withdrawal and surrender clear stale task ownership without erasing evidence',()=>{
 const s=newSession(),a=enemies(s)[0],memory=a.awareness;
 a.searchOrigin=point(5,5);a.searchQueue=[point(7,7)];a.coordinationRole='support';a.coordinationUntil=99;
 a.defense=point(20,20);a.nav=[point(20,20)];
 commitNpcWithdrawal(a,point(10,10),5);
 assert.equal(a.alert,'retreat');assert.equal(a.defense,null);assert.equal(a.coordinationRole,null);
 assert.equal(a.searchOrigin,null);assert.deepEqual(a.retreatPoint,point(10,10));assert.equal(a.awareness,memory);
 clearNpcTasks(a);assert.equal(a.retreatPoint,null);assert.equal(a.alert,'idle');assert.equal(a.awareness,memory);
 const peer={...a,id:'peer',p:{...a.p},health:3,surrendered:true};
 assert.equal(countNearbyEnemyAllies(a,[a,peer]),0);
});

import {canAcceptNpcAssignment,clearNpcCoordination} from '../src/breach-ai-task-state.ts';
test('EA8 an active local task survives new reports until expiry or urgent interruption',()=>{
 const a=enemies(newSession())[0];a.intent=null;a.alert='idle';
 assert.equal(canAcceptNpcAssignment(a,2),true);
 a.coordinationRole='support';a.coordinationUntil=8;a.coordinationReportId=17;
 a.coordinationOwnsDefense=true;a.defense=point(30,40);a.nav=[point(30,40)];
 assert.equal(canAcceptNpcAssignment(a,3),false);
 assert.equal(canAcceptNpcAssignment(a,8),true);
 clearNpcCoordination(a,true);
 assert.equal(a.coordinationReportId,undefined);assert.equal(a.defense,null);assert.deepEqual(a.nav,[]);
 a.alert='retreat';assert.equal(canAcceptNpcAssignment(a,10),false);
});
test('EA9 bounded game area traversal does not invent window navigation links',()=>{
 const rooms=[{id:'a',kind:'room',x:0,y:0,w:100,h:100},
 {id:'b',kind:'room',x:100,y:0,w:100,h:100},
 {id:'c',kind:'room',x:200,y:0,w:100,h:100},
 {id:'d',kind:'room',x:0,y:100,w:100,h:100}];
 const doors=[{id:'ab',a:point(100,30),b:point(100,70)},{id:'bc',a:point(200,30),b:point(200,70)}];
 const index=buildAiSiteIndex({rooms,windows:[{id:'w',x:50,y:100,width:30,vertical:false}]},[],doors);
 assert.deepEqual(connectedAreaCenters(index,point(50,50),2),[point(150,50),point(250,50)]);
});

import {hostilePhysicalityAt} from '../src/breach-hostile-physicality.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
test('EA11 a recorded report causes a bounded presentation-only gesture; older films clear it',()=>{
 const s=newSession(),a=enemies(s)[0];a.alert='idle';a.aim=0;a.velocity=0;a.reload=0;
 a.lastReportAt=3;s.seconds=3.4;
 const recorded=snapshot(s);
 assert.ok(hostilePhysicalityAt(a,3.4).headPitch>0);
 assert.equal(hostilePhysicalityAt(a,2.9).headPitch,0);
 a.aim=.5;assert.equal(hostilePhysicalityAt(a,3.4).headPitch,0);
 applyReplayFrame(s,recorded);assert.ok(hostilePhysicalityAt(a,3.4).headPitch>0);
 const legacy=snapshot(s);for(const f of legacy.actors)delete f.lastReportAt;
 applyReplayFrame(s,legacy);assert.equal(hostilePhysicalityAt(a,3.4).headPitch,0);
});

import {rememberChecked,recentlyChecked} from '../src/breach-ai-search-memory.ts';
import {reportToListener} from '../src/breach-communication.ts';
test('EA7 inspected-area memory is finite, expires, and yields to fresh evidence',()=>{
 const checked=[];
 assert.ok(rememberChecked(checked,point(10,10),2,1,'personal'));
 assert.equal(rememberChecked(checked,point(12,12),3,1,'report'),false);
 assert.equal(recentlyChecked(checked,point(12,12),3,1),true);
 assert.equal(recentlyChecked(checked,point(12,12),4,3),false);
 assert.equal(recentlyChecked(checked,point(12,12),30,1),false);
 for(let i=0;i<30;i++)rememberChecked(checked,point(100+i*30,0),10+i,1,'personal');
 assert.equal(checked.length,16);
});
test('EA7 received area-clear report records an inspection without creating a threat task',()=>{
 const s=newSession(),sender=enemies(s)[0];s.seconds=10;sender.encounterGroupId='shared';
 const recipient={...sender,id:'checked-peer',surrendered:false,health:2,awareness:newAwareness(),
  suspicion:structuredClone(sender.suspicion),contact:null,alert:'idle',intent:null,
  coordinationRole:null,coordinationUntil:0,checkedSearchAreas:[]};
 const report={id:901,senderId:sender.id,at:10,origin:{...sender.p},estimate:{...sender.p},
  uncertainty:8,deliveredTo:[],kind:'area-checked'};
 s.reports=[report];
 const controller=createEnemyDecisionController({
  approach:()=>{},cachedEnemyRoute:()=>[],requestClearFireStep:()=>false,
  inSight:()=>false,enemies:()=>[sender,recipient],hear:()=>{},notify:()=>{},battleEvent:()=>{}
 });
 controller.distributeReports(s);
 assert.equal(recipient.awareness.observations[0].kind,'area-checked');
 assert.equal(recipient.checkedSearchAreas.length,1);assert.equal(recipient.contact,null);
 assert.equal(recipient.coordinationRole,null);assert.equal(recipient.alert,'idle');
});
