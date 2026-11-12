import test from 'node:test';
import assert from 'node:assert/strict';
import {entryCorrectionEligible} from '../src/breach-order-entry.ts';
const p=(x,y)=>({x,y});
test('R7.3 entry handle correction is short and physically bounded',()=>{
 const state={blockedTime:0,recoveryAttempts:0};
 assert.equal(entryCorrectionEligible(state,p(0,0),p(21,0)),true);
 assert.equal(entryCorrectionEligible(state,p(0,0),p(1,0)),false,
  'no micro-oscillation at the final handle position');
 assert.equal(entryCorrectionEligible(state,p(0,0),p(80,0)),false,
  'no surprise long-distance route for an ENTRY TOOL order');
});
test('R7.3 repeated failed correction becomes a terminal actionable order',()=>{
 const near=p(0,0),handle=p(16,0);
 assert.equal(entryCorrectionEligible({blockedTime:3.6,recoveryAttempts:0},
  near,handle),false,'a persistent physical blocker terminates correction');
 assert.equal(entryCorrectionEligible({blockedTime:0,recoveryAttempts:5},
  near,handle),false,'navigation retry budget is finite');
 assert.equal(entryCorrectionEligible({blockedTime:3.49,recoveryAttempts:4},
  near,handle),true,'temporary obstacles retain a recovery opportunity');
});
