import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {operationBrief,assessOperation,parseOperationHistory,
  addOperationRecord} from '../src/breach-operations.ts';
import {newSession,team,enemies,toggling,stepSession,
  operationBriefing,debrief,missionText} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
const steps=(s,n)=>{for(let i=0;i<n;i++)stepSession(s,1/60);};

test('155: five mission briefs specify distinct conditions without enemy leaks',()=>{
 const kinds=['clear','intel','rescue','hold','capture'];
 for(const type of kinds){
   const brief=operationBrief(type);
   assert.ok(brief.code&&brief.objective&&brief.extraction);
   assert.ok(!brief.objective.includes('GUARD 1'));
 }
 const s=newSession(0,1);
 const brief=operationBriefing(s);
 assert.equal(brief.code,'DOCUMENT RECOVERY');
 assert.ok(brief.building&&brief.layout);
 assert.ok(brief.squad>=4);
 activateSite(null);
});
test('155: intelligence recovery takes interrupted time, not instant tap',()=>{
 const s=newSession(0,1),a=team(s)[0];
 enemies(s).forEach(e=>e.health=0);
 a.p={...s.scenario.objective};
 toggling(s);steps(s,45);
 assert.equal(s.mission,'secure');
 assert.ok(s.holdTime>.5);
 a.p={...s.scenario.extract};steps(s,80);
 assert.equal(s.mission,'secure','leaving evidence interrupts recovery');
 assert.ok(s.holdTime<.2);
 a.p={...s.scenario.objective};steps(s,85);
 assert.equal(s.mission,'extract');
 assert.ok(s.battleEvents.some(e=>e.text==='DOCUMENTS RECOVERED'));
 activateSite(null);
});
test('155: enemy pressure prevents securing the hold objective',()=>{
 const s=newSession(0,3),a=team(s)[0],e=enemies(s)[0];
 a.p={...s.scenario.objective};
 e.p={x:a.p.x+22,y:a.p.y};
 toggling(s);stepSession(s,1/60);
 assert.equal(s.mission,'secure');
 assert.ok(s.holdTime<.1);
 e.health=0;enemies(s).forEach(x=>x.health=0);
 steps(s,430);
 assert.equal(s.mission,'extract');
 activateSite(null);
});
test('155: target must be secured by approaching the downed position',()=>{
 const s=newSession(0,4),a=team(s)[0];
 const target=enemies(s).find(e=>e.id===s.captureTarget);
 assert.ok(target);
 target.health=0;target.injuryStage=3;
 toggling(s);stepSession(s,1/60);
 assert.equal(s.mission,'secure');
 assert.equal(s.captureSecured,false);
 a.p={...target.p};stepSession(s,1/60);
 assert.equal(s.captureSecured,true);
 assert.equal(s.mission,'extract');
 activateSite(null);
});
test('155: debrief grades are reproducible and history is bounded',()=>{
 const input={kind:'capture',outcome:'success',elapsed:120,
   casualties:0,teamSize:4,shots:20,hits:9,objective:true,
   extracted:4,targetSurrendered:true};
 const assessed=assessOperation(input);
 assert.equal(assessed.accuracy,45);
 assert.deepEqual(assessOperation(input),assessed);
 const record={seed:4,kind:'capture',outcome:'success',
   grade:assessed.grade,elapsed:120,casualties:0};
 let history=[];
 for(let i=0;i<20;i++)
   history=addOperationRecord(history,{...record,seed:i});
 assert.equal(history.length,12);
 assert.deepEqual(parseOperationHistory(JSON.stringify(history)),history);
 assert.deepEqual(parseOperationHistory('bad json'),[]);
 const s=newSession(0,4);
 assert.equal(typeof debrief(s).grade,'string');
 assert.ok(missionText(s).includes('TARGET'));
 activateSite(null);
});
test('155: briefing and operation history are present on both entry pages',()=>{
 const app=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(app,/recordCompletedOperation\(/);
 assert.match(app,/operationBriefing\(state\)/);
 for(const path of ['../index.html','../breach.html']){
   const html=readFileSync(new URL(path,import.meta.url),'utf8');
   assert.match(html,/id="briefingPanel"/);
   assert.match(html,/id="briefingToggle"/);
 }
});
