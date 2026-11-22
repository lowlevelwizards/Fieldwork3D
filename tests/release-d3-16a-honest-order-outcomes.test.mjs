import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {completeOrder,failCurrentOrder}
 from '../src/breach-order-lifecycle.ts';
import {executionStatus} from '../src/breach-execution-state.ts';
import {physicalOrderOutcome,successfulSquadExecution}
 from '../src/breach-order-outcome.ts';

test('D3.16A: one real locked-door cancel is remembered after queue drains',()=>{
 const s=newSession(),a=team(s)[0],messages=[];
 try{
  const first={id:16001,kind:'move',p:{x:a.p.x+180,y:a.p.y+100}};
  const next={id:16002,kind:'wait',p:{...a.p},duration:.5};
  a.plan=[first,next];a.completedOrders=0;a.failedOrders=0;
  const notify=(_s,x)=>messages.push(x);
  failCurrentOrder(s,a,first,'PATH BLOCKED · DOOR LOCKED',notify);
  failCurrentOrder(s,a,first,'PATH BLOCKED · DOOR LOCKED',notify);
  assert.equal(a.failedOrders,1,'stale failure callback never counts twice');
  assert.equal(a.completedOrders,0,'cancellation does not earn completion');
  assert.equal(a.plan[0].id,next.id,'following authored orders still execute');
  assert.equal(a.lastFailedOrder.id,first.id);
  assert.match(a.lastFailedOrder.reason,/DOOR LOCKED/);
  assert.equal(a.orderIssue,null,'failed node cannot masquerade as active issue');
  completeOrder(a);
  assert.equal(a.plan.length,0);
  assert.equal(a.completedOrders,1);
  assert.equal(a.failedOrders,1);
  const status=executionStatus(a);
  assert.equal(status.kind,'blocked');
  assert.equal(status.reason,'entry-interrupted',
   'the newer interruption snapshot has a distinct, truthful status');
  assert.equal(status.label,'ENTRY INTERRUPTED');
  assert.match(status.detail,/FAILED ENTRY/);
  assert.ok(a.interruptedDoorPlan?.original.length,
   'the failure preserves the original route for diagnosis');
  assert.equal(messages.length,1);
 }finally{activateSite(null);}
});
test('D3.16A: cancellation without an interrupted door stays an order cancellation',()=>{
 const s=newSession(),a=team(s)[0];
 try{
  const move={id:16011,kind:'move',p:{x:a.p.x+40,y:a.p.y+40}};
  a.plan=[move];
  failCurrentOrder(s,a,move,'NO SAFE ROUTE',()=>{});
  assert.equal(a.interruptedDoorPlan,null);
  assert.equal(executionStatus(a).reason,'order-cancelled');
  assert.equal(executionStatus(a).label,'ORDERS CANCELLED');
 }finally{activateSite(null);}
});
test('D3.16A: successful orders never invent a cancellation',()=>{
 const s=newSession(),a=team(s)[0];
 try{
  const order={id:16003,kind:'wait',duration:.5,p:{...a.p}};
  a.plan=[order];completeOrder(a);
  assert.equal(a.failedOrders,0);
  assert.equal(a.lastFailedOrder,null);
  assert.equal(executionStatus(a).kind,'complete');
 }finally{activateSite(null);}
});
test('D3.16A: four-body physical success is independent of plan exhaustion',()=>{
 const good={arrived:true,remainingOrders:0,failedOrders:0};
 const canceled={arrived:false,remainingOrders:0,failedOrders:1};
 const obstructed={arrived:false,remainingOrders:1,failedOrders:0};
 const unreachable={arrived:false,remainingOrders:0,failedOrders:0};
 assert.equal(physicalOrderOutcome(good),'arrived');
 assert.equal(physicalOrderOutcome(canceled),'cancelled');
 assert.equal(physicalOrderOutcome(obstructed),'pending');
 assert.equal(physicalOrderOutcome(unreachable),'unreached');
 assert.equal(successfulSquadExecution([good,good,good,good]),true);
 assert.equal(successfulSquadExecution([good,good,canceled,good]),false);
 assert.equal(successfulSquadExecution([good,good,obstructed,good]),false);
 assert.equal(successfulSquadExecution([good,good,unreachable,good]),false);
 assert.equal(successfulSquadExecution([good,good,good]),false);
});
test('D3.16A: active next order always retains its own execution feedback',()=>{
 const next={id:16004,kind:'move',p:{x:100,y:100}};
 const actor={id:'rook',health:4,plan:[next],activeNode:next.id,
  blockedTime:0,lastBlocker:'clear',recoveryAttempts:0,velocity:0,
  waitRemaining:0,actionTimer:0,syncReady:null,traversal:null,
  traversalRetreating:false,traversalElapsed:0,motorPause:null,
  orderIssue:null,completedOrders:1,failedOrders:2,
  lastFailedOrder:{id:4,kind:'door',reason:'DOOR LOCKED',at:2}};
 assert.equal(executionStatus(actor).reason,'move');
 assert.equal(executionStatus({...actor,
  orderIssue:{nodeId:next.id,reason:'DESTINATION OBSTRUCTED',since:3}}).reason,'order-failed');
});
