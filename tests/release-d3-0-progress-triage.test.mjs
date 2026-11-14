import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyD3Progress} from '../src/breach-d3-progress-triage.ts';
const base={planned:true,planComplete:false,activeOrder:'move',
 motorPause:null,blockedTime:0,orderIssue:null,navCount:2,
 recentNetMovement:8};
test('D3.0: long or detouring movement is observed, not declared deadlocked',()=>{
 assert.equal(classifyD3Progress(base),'moving');
 assert.equal(classifyD3Progress({...base,recentNetMovement:1}),
  'little-net-movement');
});
test('D3.0: authored WAIT is distinct from a traffic-induced passage hold',()=>{
 assert.equal(classifyD3Progress({...base,activeOrder:'wait',
  motorPause:'passage'}),'authored-hold');
 assert.equal(classifyD3Progress({...base,motorPause:'passage'}),
  'passage-hold');
});
test('D3.0: physical blockage and explicit failures remain visible',()=>{
 assert.equal(classifyD3Progress({...base,blockedTime:1.1}),
  'physical-block');
 assert.equal(classifyD3Progress({...base,orderIssue:'LOCKED'}),
  'order-issue');
});
test('D3.0: completion and preflight denial cannot count as stuck',()=>{
 assert.equal(classifyD3Progress({...base,planComplete:true}),'completed');
 assert.equal(classifyD3Progress({...base,planned:false}),
  'unplanned');
});
