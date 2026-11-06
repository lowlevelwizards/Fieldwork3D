import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {snapshot} from '../src/breach-replay.ts';
import {auditReplayFrameForFork,captureCheckpointPrototype}
  from '../src/breach-r3-checkpoint-preflight.ts';

test('presentation film is demonstrably insufficient to resume AI/motor',()=>{
  const s=newSession(0,1817),frame=snapshot(s);
  const audit=auditReplayFrameForFork(s,frame);
  assert.equal(audit.resumable,false);
  for(const key of ['rng','nextShotId','passageLeases'])
    assert.ok(audit.missingSessionFields.includes(key),key);
  const first=s.operators[0].id;
  assert.ok(audit.missingActorFields[first].includes('nav'));
  assert.ok(audit.missingActorFields[first].includes('awareness'));
  assert.ok(audit.externalDependencies.some(x=>x.includes('WeakMap')));
});
test('prototype clone isolates Map/Set and RNG without claiming restoration',()=>{
  const s=newSession(0,1817);
  s.rng=0x12345678;
  const probe=captureCheckpointPrototype(s);
  assert.equal(probe.safeToResume,false);
  assert.equal(probe.copy.rng,s.rng);
  assert.ok(probe.copy.seenGround instanceof Set);
  assert.ok(probe.copy.known instanceof Map);
  probe.copy.rng=5;
  probe.copy.operators[0].p.x+=100;
  assert.equal(s.rng,0x12345678);
  assert.notEqual(probe.copy.operators[0].p.x,s.operators[0].p.x);
});
