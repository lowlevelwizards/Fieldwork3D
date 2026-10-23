import test from 'node:test';
import assert from 'node:assert/strict';
import { FieldIncident, planIncident } from '../src/fieldwork/field-incident.ts';
import { CrewMission } from '../src/crew/crew-mission.ts';

const tick = (incident, crew, n, near = true, hold = false) => {
  let event = null;
  for (let i = 0; i < n; i++) {
    if (hold) incident.hold();
    const hasPart = !incident.needsSupply || crew.rookHasFuse || incident.testsPerformed > 0;
    event = incident.update(0.05, near, hasPart, crew.powerIsolated) ?? event;
  }
  return event;
};
function inspect(i, crew) {
  i.interact(true, false); tick(i, crew, 28);
  assert.equal(i.phase, 'open');
  i.interact(true, false); tick(i, crew, 32);
  assert.equal(i.phase, 'diagnosed');
}
function supply(crew) {
  for (let i = 0; i < 30; i++) crew.advance(.05, true, false, false);
  assert.equal(crew.stage, 'delivering');
  for (let i = 0; i < 30; i++) crew.advance(.05, false, true, false);
  assert.equal(crew.stage, 'delivered');
}
function isolation(crew) {
  for (let i = 0; i < 30; i++) crew.advance(.05, true, false, false);
  assert.equal(crew.powerIsolated, true);
  assert.equal(crew.stage, 'delivered');
}

test('three service procedures execute through crew logistics and equipment effects', () => {
  for (const index of [0, 1, 2, 4]) {
    const i = new FieldIncident(planIncident(index));
    const crew = new CrewMission();
    inspect(i, crew);
    assert.equal(i.diagnosed, true);
    const assignment = i.fault === 'contactor' ? 'isolation' : i.fault;
    crew.diagnose(assignment);
    if (assignment === 'isolation') isolation(crew); else supply(crew);
    assert.equal(i.interact(true, i.fault === 'contactor' || crew.rookHasFuse), true);
    tick(i, crew, 80, true, true);
    assert.equal(i.phase, 'prepared');
    if (i.needsSupply) assert.equal(crew.installFuse(), true);
    assert.equal(i.interact(true, true), true);
    tick(i, crew, 30);
    if (i.phase === 'secondary') {
      assert.equal(i.tripped, true);
      assert.equal(crew.reassignIsolation(), true);
      assert.equal(i.interact(true, false), false);
      isolation(crew);
      i.interact(true, true);
      tick(i, crew, 45, true, true);
      assert.equal(i.phase, 'prepared');
      i.interact(true, true);
      tick(i, crew, 60);
    } else {
      tick(i, crew, 30);
    }
    assert.equal(i.phase, 'complete');
    assert.equal(i.outcome, 'restored');
    assert.equal(crew.finishJob(true), true);
    assert.equal(crew.stage, 'returning');
    crew.advance(.05, false, false, false);
    assert.equal(crew.stage, 'returning');
    assert.equal(crew.advance(.05, true, true, true), 'finished');
  }
});

test('deferred job consumes no part and stays offline while crew return', () => {
  const incident = new FieldIncident(planIncident(0));
  const crew = new CrewMission();
  inspect(incident, crew); crew.diagnose('fuse');
  assert.equal(incident.defer(), true);
  assert.equal(crew.finishJob(false), true);
  assert.equal(crew.relayPowered, false);
  assert.equal(crew.advance(.05, false, false, true), 'finished');
  assert.equal(incident.outcome, 'deferred');
  assert.equal(incident.replacementInstalled, false);
});
