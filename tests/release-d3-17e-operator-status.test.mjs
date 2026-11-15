import test from 'node:test';
import assert from 'node:assert/strict';
import {executionStatus} from '../src/breach-execution-state.ts';
const base=()=>({id:'moss',health:100,
 plan:[{kind:'move',id:1,p:{x:40,y:0}}],
 activeNode:1,blockedTime:4,lastBlocker:'route',recoveryAttempts:5,
 velocity:0,waitRemaining:0,actionTimer:0,syncReady:null,
 traversal:null,traversalRetreating:false,traversalElapsed:0,
 motorPause:null,orderIssue:null,completedOrders:0,
 failedOrders:0,passageWaitSeconds:0});
test('E9 unreachable route status retains authored order; no hidden culprit',()=>{
 const a=base(),status=executionStatus(a,{phase:'running'});
 assert.equal(status.label,'ROUTE UNAVAILABLE');
 assert.equal(status.detail,'ORDERS RETAINED');
 assert.equal(a.plan.length,1);
});
test('E9 observed obstacle distinguishes door/furniture/wall without fog leak',()=>{
 const a=base();
 for(const [blocker,label] of [['door','DOOR OBSTRUCTED'],
  ['furniture','MOVEMENT OBSTRUCTED'],['wall','WALL OBSTRUCTION']]){
   a.lastBlocker=blocker;
   assert.equal(executionStatus(a,{phase:'running'}).label,label);
 }
});
test('E9 SYNC reports visible pending squadmate rather than fictional blockage',()=>{
 const a=base();a.plan=[{kind:'sync',id:3,syncCode:'B1'}];
 a.blockedTime=0;a.lastBlocker='clear';
 const peers=[{id:'moss',health:100,syncReady:'B1',plan:a.plan},
 {id:'rook',health:100,syncReady:null,plan:[{kind:'sync',id:4,syncCode:'B1'}]}];
 const result=executionStatus(a,{phase:'running',peers});
 assert.equal(result.label,'SYNC B1');
 assert.equal(result.detail,'1/2 READY',
  'compatibility: canonical sync readiness detail is unchanged');
 assert.equal(result.waitingFor,'rook');
 assert.equal(result.reason,'sync');
});
test('E9 intentionally authored WAIT remains WAIT',()=>{
 const a=base();a.plan=[{kind:'wait',id:3,duration:1}];
 a.blockedTime=0;a.lastBlocker='clear';
 assert.equal(executionStatus(a,{phase:'running'}).label,'WAIT');
});
