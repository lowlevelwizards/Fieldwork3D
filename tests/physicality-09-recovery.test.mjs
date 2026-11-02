import test from 'node:test';import assert from 'node:assert/strict';
import {routeRetrySeconds,recoveryAction,madeProgress}
 from '../src/breach-movement-recovery.ts';
test('route retry is bounded exponential-ish and not every tick',()=>{
 assert.ok(routeRetrySeconds(1)>.6);
 assert.ok(routeRetrySeconds(10)<=3.2);
 assert.ok(routeRetrySeconds(5)>routeRetrySeconds(2));
});
test('person, leaf, solid obstruction have distinct hysteretic recovery',()=>{
 assert.equal(recoveryAction('actor',.2,2),'wait');
 assert.equal(recoveryAction('actor',.9,.8),'detour');
 assert.equal(recoveryAction('door',.5,.9),'wait');
 assert.equal(recoveryAction('door',1,.9),'replan');
 assert.equal(recoveryAction('furniture',.6,.9),'replan');
 assert.equal(recoveryAction('wall',.6,.1),'wait');
 assert.equal(recoveryAction('route',5,2.5,7),'report');
});
test('genuine progress resets recovery, but jitter does not',()=>{
 assert.equal(madeProgress({x:1,y:2},{x:1.005,y:2.005}),false);
 assert.equal(madeProgress({x:1,y:2},{x:1.3,y:2}),true);
});
