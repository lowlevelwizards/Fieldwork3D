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
test('R7.5 status never leaks undiscovered lock, brace, or jam world truth',()=>{
 const baseline=executionStatus(waiting(),{doors:[
  {id:'ENTRY',open:false}]});
 for(const door of [
  {id:'ENTRY',open:false,locked:true},
  {id:'ENTRY',open:false,heldBy:'GUARD'},
  {id:'ENTRY',open:false,jammed:true}
 ]){
  const status=executionStatus(waiting(),{doors:[door]});
  assert.deepEqual(status,baseline,
   'truth about an untested mechanism is not player knowledge');
 }
});
test('R7.5 confirmed motor diagnosis still gives actionable details',()=>{
 for(const reason of ['door-locked','door-held','door-obstructed']){
  const status=executionStatus({...waiting(),motorPause:reason});
  assert.equal(status.kind,'blocked');
  assert.equal(status.reason,reason);
 }
 const failed=executionStatus({...waiting(),
  orderIssue:{nodeId:1,reason:'LOCK BLOCKED',since:1}});
 assert.equal(failed.detail,'LOCK BLOCKED');
 assert.equal(failed.kind,'blocked');
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
