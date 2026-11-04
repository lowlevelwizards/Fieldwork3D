import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryAction,routeRetrySeconds}
 from '../src/breach-movement-recovery.ts';

test('persistent opposing-body jam escalates beyond repeated micro-detours',()=>{
 assert.equal(recoveryAction('actor',.25,2),'wait');
 assert.equal(recoveryAction('actor',.9,.8),'detour');
 assert.equal(recoveryAction('actor',1.8,.8),'replan');
 assert.equal(recoveryAction('actor',5,1.0,6),'wait',
  'failed route searches need a bounded quiet period');
 assert.equal(recoveryAction('actor',5,2.1,6),'report');
});

test('repeatedly failed world-truth routing does not replan every cooldown',()=>{
 for(const blocker of ['wall','door','furniture','route','actor']){
  assert.equal(recoveryAction(blocker,5,.7,7),'wait',blocker);
  assert.equal(recoveryAction(blocker,5,2.2,7),'report',blocker);
 }
 assert.ok(routeRetrySeconds(100)<=3.2);
});

test('temporary hinge, actor and static geometry retain different thresholds',()=>{
 assert.equal(recoveryAction('door',.5,.9),'wait');
 assert.equal(recoveryAction('door',1,.9),'replan');
 assert.equal(recoveryAction('furniture',.6,.9),'replan');
 assert.equal(recoveryAction('actor',.8,.9),'detour');
});
