import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {executionStatus} from '../src/breach-execution-state.ts';
import {executionTransition} from '../src/breach-execution-events.ts';
import {newSession,team,stepSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
const site={
 seed:432,name:'EXECUTION RESILIENCE B',training:true,layout:'corridor',
 rooms:[],roomCount:0,doors:[],cover:[],walls:[],windows:[],
 enemies:[],entrance:{x:120,y:120},
 spawn:[{x:120,y:120},{x:125,y:210},{x:135,y:235},{x:140,y:255}],
 objective:{x:240,y:120},extract:{x:245,y:120},
 bounds:{minX:0,minY:0,maxX:420,maxY:320}
};
const actor=(plan=[])=>({
 id:'rook',health:4,plan,activeNode:plan[0]?.id??-1,
 blockedTime:0,lastBlocker:'clear',recoveryAttempts:0,velocity:0,
 waitRemaining:0,actionTimer:0,syncReady:null,traversal:null,
 traversalRetreating:false,traversalElapsed:0,motorPause:null,
 passageWaitSeconds:0,orderIssue:null,completedOrders:0
});
test('door clearance and contact holds are distinct from generic WAIT',()=>{
 const n={id:4,kind:'door',p:{x:120,y:120},doorId:'D',method:'open'};
 const a=actor([n]);a.actionTimer=.39;
 let status=executionStatus(a,{doors:[{id:'D',open:false,openFraction:0}]});
 assert.equal(status.label,'DOOR');
 assert.equal(status.progress,.5);
 status=executionStatus(a,{doors:[{id:'D',open:true,openFraction:.36}]});
 assert.equal(status.kind,'waiting');
 assert.equal(status.reason,'door-swing');
 assert.equal(executionStatus({...a,motorPause:'contact'}).kind,'holding');
});
test('traffic stalls surface without introducing squad role automation',()=>{
 const a=actor([{id:3,kind:'move',p:{x:170,y:120}}]);
 a.motorPause='passage';a.passageWaitSeconds=5.7;
 assert.equal(executionStatus(a).kind,'blocked');
 assert.equal(executionStatus(a).reason,'traffic-stall');
 assert.equal(executionStatus({...a,passageWaitSeconds:1}).kind,'waiting');
 assert.equal(executionStatus({...a,motorPause:null}).kind,'moving');
});
test('failed flash, reload, furniture and missing door orders are retained',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const a=team(s)[0];s.phase='running';
  const scenarios=[
   [{id:211,kind:'flash',p:{...a.p},aimPoint:{x:240,y:240}},()=>{
      a.flashCharges=0;
    },'FLASH UNAVAILABLE'],
   [{id:212,kind:'reload',p:{...a.p}},()=>{
      a.flashCharges=2;a.magazine=1;a.reserve=0;
    },'RELOAD UNAVAILABLE · CHECK AMMO'],
   [{id:213,kind:'door',p:{...a.p},doorId:'MISSING',method:'open'},()=>{
      a.reserve=20;
    },'DOOR MISSING'],
   [{id:214,kind:'interact',p:{...a.p},objectId:'prop:9999',interaction:'push'},()=>{},
    'OBJECT UNAVAILABLE']
  ];
  for(const [order,setup,expected] of scenarios){
    a.plan=[order];a.activeNode=-1;a.orderIssue=null;
    setup();stepSession(s,1/30);
    assert.equal(a.plan[0]?.id,order.id,'failed order must remain editable');
    assert.equal(a.orderIssue?.reason,expected);
  }
 }finally{activateSite(null);}
});
test('transition log is sparse, typed, friendly-only and replay captures it',()=>{
 const moving=executionStatus(actor([{id:1,kind:'move',p:{x:180,y:180}}]));
 const broken=executionStatus({...actor([{id:1,kind:'move',p:{x:180,y:180}}]),
   orderIssue:{nodeId:1,reason:'NO ROUTE',since:2}});
 assert.equal(executionTransition(null,moving,'ROOK')?.kind,'started');
 assert.equal(executionTransition(moving,moving,'ROOK'),null);
 assert.equal(executionTransition(moving,broken,'ROOK')?.kind,'blocked');
 assert.equal(executionTransition(broken,moving,'ROOK')?.kind,'resumed');
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const a=team(s)[0];a.plan=[{id:301,kind:'door',p:{...a.p},
    doorId:'MISSING',method:'open'}];
  s.phase='running';
  stepSession(s,1/30);
  assert.ok(s.executionEvents.some(e=>e.actor===a.id&&e.kind==='blocked'));
  assert.ok(s.executionEvents.every(e=>team(s).some(o=>o.id===e.actor)));
  const count=s.executionEvents.length;
  for(let i=0;i<8;i++)stepSession(s,1/30);
  assert.equal(s.executionEvents.length,count,'stable failure never spams events');
  const recorder=new MissionRecorder();
  recorder.capture(s,true);
  assert.ok(recorder.executionEvents.some(e=>e.kind==='blocked'));
  assert.equal(recorder.executionEvents[0].actor,a.id);
 }finally{activateSite(null);}
});
test('both 2D and projected views draw persistent issue markers; replay uses the same log',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const renderer=readFileSync(new URL('../src/breach-2d-actor-renderer.ts',import.meta.url),'utf8');
 const projected=readFileSync(new URL('../src/breach-2d-projected-overlays.ts',import.meta.url),'utf8');
 const picking=readFileSync(new URL('../src/breach-tactical-picking.ts',import.meta.url),'utf8');
 const replay=readFileSync(new URL('../src/breach-replay.ts',import.meta.url),'utf8');
 assert.match(main,/actor2D\.drawExecutionProblem\(a,false\)/);
 assert.match(renderer,/const status=executionProblemStatus\(a\)/);
 assert.match(projected,/drawExecutionProblem\(a,true\)/);
 assert.match(picking,/executionMarkerPoint\(unit,viewMode!=='plan2d'\)/);
 assert.match(picking,/nodeId:problem\.orderId/);
 assert.match(replay,/this\.executionEvents\.push/);
});
