import test from 'node:test';
import assert from 'node:assert/strict';
import { CrewMission } from '../src/crew/crew-mission.ts';

function advance(m, count, atTruck, nearRook, crewHome = false) {
  let result = null;
  for (let i = 0; i < count; i++) result = m.advance(0.1, atTruck, nearRook, crewHome) ?? result;
  return result;
}

test('supply obligation persists while Mica travels, with actual proximity gating retrieval', () => {
  const m = new CrewMission();
  assert.equal(m.diagnose(), true);
  assert.equal(m.diagnose(), false);
  advance(m, 200, false, false);
  assert.equal(m.stage, 'fetching');
  assert.equal(m.hasTruckFuse, true);
  assert.equal(advance(m, 15, true, false), 'collect');
  assert.equal(m.stage, 'delivering');
  assert.equal(m.hasTruckFuse, false);
  assert.equal(m.micaHasFuse, true);
  advance(m, 50, false, false);
  assert.equal(m.stage, 'delivering');
});

test('moving receiver interrupts handoff, no magical remote transfer', () => {
  const m = new CrewMission(); m.diagnose();
  advance(m, 15, true, false);
  advance(m, 5, false, true);
  assert.equal(m.stage, 'handoff');
  advance(m, 2, false, false);
  assert.equal(m.stage, 'delivering');
  assert.equal(m.rookHasFuse, false);
  assert.equal(advance(m, 14, false, true), 'delivered');
  assert.equal(m.rookHasFuse, true);
  assert.equal(m.micaHasFuse, false);
});

test('part is consumed for repair, crew must physically return, and mission is replayable', () => {
  const m = new CrewMission(); m.diagnose();
  advance(m, 15, true, false); advance(m, 14, false, true);
  assert.equal(m.restorePower(), false);
  assert.equal(m.installFuse(), true);
  assert.equal(m.installFuse(), false);
  assert.equal(m.restorePower(), true);
  assert.equal(m.stage, 'returning');
  advance(m, 120, false, false, false);
  assert.equal(m.stage, 'returning');
  assert.equal(m.advance(0.1, true, true, true), 'finished');
  assert.equal(m.stage, 'finished');
  m.reset();
  assert.deepEqual(m.snapshot, {
    stage: 'standby', hasTruckFuse: true, micaHasFuse: false,
    rookHasFuse: false, relayPowered: false,
  });
});
