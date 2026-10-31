import test from 'node:test';import assert from 'node:assert/strict';
import {auditDistanceGait,canPromoteGait}
  from '../src/breach-gait-acceptance.ts';
test('candidate run has nonzero step count with finite sample frames',()=>{
 const result=auditDistanceGait('run');
 assert.ok(result.steps>10);
 assert.equal(result.finite,true);
});
test('candidate cannot silently promote without mobile visual review',()=>{
 const all=['walk','run','stop','strafe','pie','turn-180','back','crouch-walk']
   .map(auditDistanceGait);
 assert.equal(canPromoteGait(all,false),false);
});
