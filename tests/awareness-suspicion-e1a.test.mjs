import test from 'node:test';
import assert from 'node:assert/strict';
import {newSuspicion,observeSuspicion,advanceSuspicion,
  exhaustSuspicionSearch} from '../src/breach-ai-suspicion.ts';

test('E1-A: independent weak cues accumulate but same event cannot stack',()=>{
  const s=newSuspicion();
  assert.equal(observeSuspicion(s,{id:'foot/1',at:1,kind:'orient',intensity:.3,cause:'footstep'}),true);
  assert.equal(s.stage,'curious');
  const prior=s.pressure;
  assert.equal(observeSuspicion(s,{id:'foot/1',at:1,kind:'orient',intensity:.3,cause:'footstep'}),false);
  assert.equal(s.pressure,prior);
  observeSuspicion(s,{id:'foot/2',at:2,kind:'orient',intensity:.5,cause:'footstep'});
  assert.equal(s.stage,'suspicious');
});
test('E1-A: violent evidence alerts, then eases slowly with hysteresis',()=>{
  const s=newSuspicion();
  observeSuspicion(s,{id:'door/1',at:1,kind:'alarm',cause:'kick'});
  assert.equal(s.stage,'alerted');
  advanceSuspicion(s,2,1);
  assert.equal(s.stage,'alerted');
  for(let t=3;t<70;t++)advanceSuspicion(s,t,1);
  assert.notEqual(s.stage,'alerted');
  for(let t=70;t<120;t++)advanceSuspicion(s,t,1);
  assert.equal(s.stage,'unaware');
});
test('E1-A: direct visual contact is categorical without location access',()=>{
  const s=newSuspicion();
  observeSuspicion(s,{id:'vision/guard/rook/9',at:9,kind:'contact',cause:'confirmed-sight'});
  assert.equal(s.pressure,1);
  assert.equal(s.stage,'alerted');
  assert.equal('estimate' in s,false);
  assert.equal('targetId' in s,false);
});
test('E1-A: search stage and exhausted search do not delete existing memory',()=>{
  const s=newSuspicion();
  observeSuspicion(s,{id:'glass/1',at:3,kind:'investigate',cause:'glass'});
  assert.equal(advanceSuspicion(s,3.2,.2,true),'searching');
  exhaustSuspicionSearch(s,5);
  assert.equal(s.stage,'suspicious');
  assert.equal(s.searchExhaustedAt,5);
  assert.equal(s.lastCause,'glass');
});
test('E1-A: out-of-order evidence and invalid elapsed time cannot corrupt state',()=>{
  const s=newSuspicion();
  observeSuspicion(s,{id:'gun/2',at:5,kind:'alarm',cause:'gunshot'});
  assert.equal(observeSuspicion(s,{id:'old/1',at:4,kind:'alarm',cause:'gunshot'}),false);
  assert.equal(advanceSuspicion(s,6,Number.NaN),s.stage);
  assert.ok(Number.isFinite(s.pressure));
});
