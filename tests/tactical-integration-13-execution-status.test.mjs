import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {executionStatus} from '../src/breach-execution-state.ts';
import {newSession,team,stepSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

const actor=(plan=[])=>({
 id:'rook',health:4,plan,activeNode:plan[0]?.id??-1,
 blockedTime:0,lastBlocker:'clear',recoveryAttempts:0,velocity:0,
 waitRemaining:0,actionTimer:0,syncReady:null,traversal:null,
 traversalRetreating:false,traversalElapsed:0,motorPause:null,
 orderIssue:null,completedOrders:0
});
const move={id:1,kind:'move',p:{x:155,y:135}};
const site={
 seed:431,name:'EXECUTION STATUS TEST',training:true,layout:'corridor',
 rooms:[],roomCount:0,doors:[],cover:[],walls:[],windows:[],
 enemies:[],entrance:{x:120,y:120},
 spawn:[{x:120,y:120},{x:125,y:210},{x:135,y:235},{x:140,y:255}],
 objective:{x:240,y:120},extract:{x:245,y:120},
 bounds:{minX:0,minY:0,maxX:420,maxY:320}
};

test('one authoritative status distinguishes traffic, physical recovery, failure and planning',()=>{
 const a=actor([move]);
 assert.equal(executionStatus(a).kind,'moving');
 assert.equal(executionStatus({...a,motorPause:'passage'}).reason,'traffic');
 assert.equal(executionStatus({...a,motorPause:'door-opening'}).detail,'DOOR OPENING');
 assert.equal(executionStatus({...a,blockedTime:1,lastBlocker:'wall'}).kind,'recovering');
 assert.equal(executionStatus({...a,blockedTime:4,lastBlocker:'wall'}).kind,'blocked');
 assert.equal(executionStatus({...a,orderIssue:{nodeId:1,reason:'NO TOOL',since:1}}).kind,'blocked');
 assert.equal(executionStatus(a,{phase:'planning'}).kind,'planned');
 assert.equal(executionStatus({...a,plan:[],completedOrders:2}).kind,'complete');
 assert.equal(executionStatus({...a,plan:[]}).kind,'idle');
});
test('timed WAIT, entry gate, SYNC and a traversing operator remain distinct',()=>{
 const wait={id:2,kind:'wait',p:{x:120,y:120},duration:2};
 let a=actor([wait]);a.waitRemaining=1;
 assert.equal(executionStatus(a).progress,.5);
 a=actor([{...wait,doorId:'D'}]);
 assert.equal(executionStatus(a,{doors:[{id:'D',open:false,openFraction:0}]}).reason,'entry-gate');
 assert.equal(executionStatus({...a,actionTimer:2.7},{doors:[{id:'D',open:false}]}).kind,'blocked');
 assert.equal(executionStatus({...a,actionTimer:2.7},{doors:[{id:'D',open:true,openFraction:1}]}).kind,'waiting');
 const sync={id:3,kind:'sync',p:{x:120,y:120},syncCode:'A'};
 a=actor([sync]);a.syncReady='A';
 assert.equal(executionStatus(a,{peers:[a,{...a,id:'moss',syncReady:null}]}).detail,'1/2 READY');
 a=actor([move]);a.traversal={kind:'climb-window',duration:1.4};a.traversalElapsed=.7;
 assert.equal(executionStatus(a).kind,'working');
 assert.equal(executionStatus(a).progress,.5);
 assert.equal(executionStatus({...a,traversalRetreating:true}).kind,'recovering');
});
test('unavailable entry tool is retained and reported once, never silently popped',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const a=team(s)[0];
  a.plan=[{id:888,kind:'tool',p:{...a.p},
   doorId:'NOT-A-DOOR',toolMethod:'pry'}];
  s.phase='running';
  stepSession(s,1/30);
  assert.equal(a.plan[0]?.id,888);
  assert.equal(a.orderIssue?.reason,'ENTRY TOOL UNAVAILABLE');
  const count=s.events.filter(x=>x.includes('ENTRY TOOL UNAVAILABLE')).length;
  for(let i=0;i<10;i++)stepSession(s,1/30);
  assert.equal(a.plan[0]?.id,888);
  assert.equal(s.events.filter(x=>x.includes('ENTRY TOOL UNAVAILABLE')).length,count);
  assert.equal(executionStatus(a).kind,'blocked');
 }finally{activateSite(null);}
});
test('operator cards expose a compact status and accessible reason, without new tactical orders',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const hud=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/breach-style.css',import.meta.url),'utf8');
 assert.match(main,/executionStatus\(a,/);
 assert.match(hud,/executionStatus\(a,/);
 assert.match(hud,/stateLine\.dataset\.kind=execution\?\.kind/);
 assert.match(hud,/\.unit-execution/);
 assert.match(css,/unit-execution\[data-kind="blocked"\]/);
});
