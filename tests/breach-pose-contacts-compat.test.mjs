/** Canonical pose-contact ownership: no V3 shadow implementation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePoseContactOwners as canonical}
 from '../src/breach-pose-contacts.ts';
import {resolvePoseContactOwners as legacy}
 from '../src/breach-pose-v3-contacts.ts';
import {resolveOperatorActionState}
 from '../src/breach-pose-action-state.ts';

const base={surrender:false,down:false,downProgress:0,
 treatmentActive:false,reloadActive:false,reloadProgress:0,
 reloadMode:'emergency',throwActive:false,pushActive:false,
 woundedGuard:false,doorActive:false};
test('UOP E: legacy and canonical imports share exactly one authority',()=>{
 assert.strictEqual(legacy,canonical);
 for(const [overrides,expected] of [
  [{},'hold'],
  [{reloadActive:true,reloadProgress:.5},'reload'],
  [{doorActive:true},'door'],
  [{throwActive:true},'throw'],
  [{surrender:true,reloadActive:true},'surrender'],
  [{down:true,doorActive:true},'down']
 ]){
  const input={...base,...overrides};
  assert.equal(canonical(input).action,expected);
  assert.deepEqual(legacy(input),canonical(input));
 }
});
test('UOP E: canonical ownership drives the action state sampled by the rig',()=>{
 const p={seconds:10,lastThrowAt:10,lastDoorAt:-100,
   doorMethod:'open',reload:0,reloadDuration:1.8,weapon:'carbine',
   down:false,surrender:false,injury:0,aiming:false,firing:false};
 const a=resolveOperatorActionState(p,0,false);
 assert.deepEqual(a.handOwners,canonical({
   ...base,throwActive:true
 }));
});
