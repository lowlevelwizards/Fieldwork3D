import test from 'node:test';
import assert from 'node:assert/strict';
import {captureTargetMayWithdraw} from '../src/breach-ai-mission-response.ts';
const f={mission:'capture',role:'target',confirmedSight:true,
 heardAlarm:false,hasEstimate:true,isAlreadyWithdrawing:false,
 secondsSinceAttempt:12};
test('E4-A: only an informed capture target considers withdrawal',()=>{
 assert.equal(captureTargetMayWithdraw(f),true);
 for(const change of [
 {mission:'clear'},{role:'sentry'},{confirmedSight:false},
 {hasEstimate:false},{isAlreadyWithdrawing:true},
 {secondsSinceAttempt:1}
 ]){
  const facts={...f,...change};
  if(!facts.confirmedSight&&facts.heardAlarm)continue;
  assert.equal(captureTargetMayWithdraw(facts),false);
 }
});
test('E4-A: a genuinely heard alarm can justify caution without visible target',()=>{
 assert.equal(captureTargetMayWithdraw({...f,confirmedSight:false,heardAlarm:true}),true);
 assert.equal(captureTargetMayWithdraw({...f,confirmedSight:false,heardAlarm:true,hasEstimate:false}),false);
});
