import test from 'node:test';
import assert from 'node:assert/strict';
import { FieldIncident, planIncident } from '../src/fieldwork/field-incident.ts';

function advance(i, seconds, ready = true, isolated = true, held = false) {
  let result = null;
  for (let x = 0; x < seconds * 20; x++) {
    if (held) i.hold();
    result = i.update(0.05, true, ready, isolated) ?? result;
  }
  return result;
}
function inspect(i) {
  assert.equal(i.interact(true, false), true);
  advance(i, 1.4);
  assert.equal(i.phase, 'open');
  i.interact(true, false); advance(i, 1.6);
  assert.equal(i.phase, 'diagnosed');
}

test('three distinct diagnosable faults repeat deterministically', () => {
  assert.deepEqual([0,1,2,3,4,5].map(n => planIncident(n).fault),
    ['fuse','terminal','contactor','fuse','terminal','contactor']);
  assert.ok(planIncident(1).oxidation > 0.7);
  assert.ok(planIncident(4).oxidation < 0.7);
});

test('no fault information before inspection, fuse requires supply and physical hold', () => {
  const i = new FieldIncident(planIncident(0));
  assert.equal(i.diagnosis, 'UNDETERMINED');
  inspect(i);
  assert.equal(i.diagnosis, 'BLOWN FUSE');
  assert.equal(i.interact(true, false), false);
  assert.equal(i.interact(true, true), true);
  i.stopHolding(); advance(i, 2, true, true);
  assert.equal(i.phase, 'working');
  advance(i, 2.2, true, true, true);
  assert.equal(i.phase, 'prepared');
  i.interact(true, true);
  assert.equal(advance(i, 3), 'restored');
  assert.equal(i.outcome, 'restored');
});

test('contactor requires isolated circuit before work', () => {
  const i = new FieldIncident(planIncident(2)); inspect(i);
  assert.equal(i.interact(true, false), false);
  assert.equal(i.interact(true, true), true);
  i.hold(); i.update(0.08, true, true, false);
  assert.equal(i.phase, 'diagnosed');
  assert.equal(i.interact(true, true), true);
  advance(i, 3.2, true, true, true);
  assert.equal(i.phase, 'prepared');
});

test('corroded terminal trips on first test and must be isolated and reseated', () => {
  const i = new FieldIncident(planIncident(1)); inspect(i);
  i.interact(true, true); advance(i, 3, true, false, true);
  assert.equal(i.phase, 'prepared');
  i.interact(true, true);
  assert.equal(advance(i, 1.5), 'trip');
  assert.equal(i.phase, 'secondary');
  assert.equal(i.tripped, true);
  assert.equal(i.interact(true, false), false);
  i.interact(true, true); i.update(.1, true, true, false);
  assert.equal(i.phase, 'secondary');
  i.interact(true, true); advance(i, 2, true, true, true);
  assert.equal(i.phase, 'prepared');
  i.update(0, true, true, false);
  i.interact(true, true);
  assert.equal(advance(i, 3), 'restored');
  assert.equal(i.testsPerformed, 2);
});

test('deferred repair remains unpowered and cannot complete', () => {
  const i = new FieldIncident(planIncident(2)); inspect(i);
  assert.equal(i.defer(), true);
  assert.equal(i.outcome, 'deferred');
  assert.equal(i.interact(true, true), false);
  assert.equal(i.update(20, true, true, true), null);
  assert.equal(i.outcome, 'deferred');
});

test('arc lasts briefly and electrical isolation immediately extinguishes it', () => {
  const i = new FieldIncident(planIncident(1)); inspect(i);
  i.interact(true, true); advance(i, 3, true, false, true);
  i.interact(true, true);
  assert.equal(advance(i, 1.3), 'trip');
  assert.ok(i.tripFlashTime > 0);
  i.update(.1, true, false, true);
  assert.equal(i.circuitIsolated, true);
  advance(i, 2, true, true);
  assert.equal(i.tripFlashTime, 0);
});

test('an isolated repair cannot be tested before reconnecting supply', () => {
  const i = new FieldIncident(planIncident(2)); inspect(i);
  i.interact(true, true);
  advance(i, 3, true, true, true);
  assert.equal(i.phase, 'prepared');
  assert.equal(i.circuitIsolated, true);
  assert.equal(i.interact(true, true), false);
  i.update(0, true, true, false);
  assert.equal(i.interact(true, true), true);
});
