import test from 'node:test';
import assert from 'node:assert/strict';
import {provisionalRouteAccepted} from '../src/breach-movement-recovery.ts';
import {fullBodyMotorRouteClear} from '../src/breach-recovery-route-validation.ts';
const p=(x,y)=>({x,y});
test('D3.18B: changing transient route is not physical progress',()=>{
 const actor={retryRouteAt:42,recoveryAttempts:5,blockedTime:4};
 provisionalRouteAccepted(actor);
 assert.equal(actor.retryRouteAt,0);
 assert.equal(actor.recoveryAttempts,5);
 assert.equal(actor.blockedTime,4);
});
test('D3.18B: shared route verifier checks all short swept legs',()=>{
 assert.equal(fullBodyMotorRouteClear(p(0,0),[p(4,0),p(8,0)],
  (a,b)=>a.x<4),false);
 assert.equal(fullBodyMotorRouteClear(p(0,0),[p(4,0),p(8,0)],
  ()=>true,9),true);
});
