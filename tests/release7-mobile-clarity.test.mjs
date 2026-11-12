import test from 'node:test';
import assert from 'node:assert/strict';
import {executionStatus} from '../src/breach-execution-state.ts';
const p=(x,y)=>({x,y});
const waiting=(actionTimer=0)=>({
 id:'ROOK',health:4,plan:[{id:1,kind:'wait',p:p(100,100),
  duration:0,doorId:'ENTRY'}],
 activeNode:1,blockedTime:0,lastBlocker:'clear',recoveryAttempts:0,
 velocity:0,waitRemaining:0,actionTimer,syncReady:null,traversal:null,
 traversalRetreating:false,traversalElapsed:0,motorPause:null,
 orderIssue:null,completedOrders:0
});
test('R7.5 mobile gate text distinguishes real locked, braced, jammed doors',()=>{
 for(const [door,fragment] of [
  [{id:'ENTRY',open:false,locked:true},'LOCKED'],
  [{id:'ENTRY',open:false,heldBy:'GUARD'},'HELD'],
  [{id:'ENTRY',open:false,jammed:true},'JAMMED']
 ]){
  const result=executionStatus(waiting(),{doors:[door]});
  assert.equal(result.kind,'blocked');
  assert.equal(result.reason,'entry-gate');
  assert.ok(result.detail.includes(fragment),result.detail);
 }
});
test('R7.5 a normal unopened entry waits briefly, then indicates blockage',()=>{
 const door={id:'ENTRY',open:false,openFraction:0};
 assert.equal(executionStatus(waiting(),{doors:[door]}).kind,'waiting');
 assert.equal(executionStatus(waiting(2.6),{doors:[door]}).kind,'blocked');
 assert.equal(executionStatus(waiting(),{doors:[]}).detail,'DOOR UNAVAILABLE');
 const opening={id:'ENTRY',open:true,openFraction:.42};
 const result=executionStatus(waiting(),{doors:[opening]});
 assert.equal(result.kind,'waiting');
 assert.equal(result.detail,'DOOR SWING NOT CLEAR');
});
