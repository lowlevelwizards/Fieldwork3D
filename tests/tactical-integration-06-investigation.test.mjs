import test from 'node:test';
import assert from 'node:assert/strict';
import {investigationTempo} from '../src/breach-ai-investigation.ts';

test('distinct tactical personalities retain bounded investigation tempos',()=>{
 const aggressive=investigationTempo('aggressor',65);
 const guard=investigationTempo('guard',65);
 const cautious=investigationTempo('cautious',65);
 assert.ok(aggressive.orientSeconds<guard.orientSeconds);
 assert.ok(guard.orientSeconds<cautious.orientSeconds);
 assert.ok(aggressive.approachScale>guard.approachScale);
 assert.ok(guard.approachScale>cautious.approachScale);
 assert.ok(cautious.inspectSeconds>aggressive.inspectSeconds);
});
test('uncertain reports prompt brief extra orientation, never omniscience',()=>{
 for(const profile of ['guard','aggressor','cautious']){
  const exact=investigationTempo(profile,0);
  const uncertain=investigationTempo(profile,240);
  assert.ok(uncertain.orientSeconds>=exact.orientSeconds);
  assert.ok(uncertain.orientSeconds<1.1);
  assert.ok(exact.inspectSeconds>=.2&&exact.inspectSeconds<1);
 }
 assert.deepEqual(investigationTempo('guard',999),
   investigationTempo('guard',240));
});
