import test from 'node:test';
import assert from 'node:assert/strict';
import { RelayProcedure } from '../src/fieldwork/relay-procedure.ts';

function finishTimed(p, seconds = 3) {
  for (let i = 0; i < seconds * 10; i++) p.update(0.1, true);
}

test('approach starts work automatically but only after proximity', () => {
  const p = new RelayProcedure();
  assert.equal(p.prompt, 'CHECK RELAY');
  assert.equal(p.interact(false), true);
  assert.equal(p.phase, 'approaching');
  p.update(1, false);
  assert.equal(p.phase, 'approaching');
  p.update(0.1, true);
  assert.equal(p.phase, 'opening');
  finishTimed(p);
  assert.equal(p.phase, 'open');
});

test('each physical intervention requires a separate deliberate action', () => {
  const p = new RelayProcedure();
  p.interact(true);
  finishTimed(p);
  assert.equal(p.phase, 'open');
  assert.equal(p.interact(false), false);
  assert.equal(p.interact(true), true);
  assert.equal(p.phase, 'inspecting');
  assert.equal(p.interact(true), false);
  finishTimed(p);
  assert.equal(p.phase, 'inspected');
  assert.equal(p.prompt, 'REPLACE FUSE');
  p.interact(true);
  finishTimed(p);
  assert.equal(p.phase, 'replaced');
  assert.equal(p.complete, false);
  p.interact(true);
  finishTimed(p);
  assert.equal(p.complete, true);
  assert.equal(p.prompt, null);
  assert.equal(p.interact(true), false);
});

test('approach is interruptible, completed work initializes restored', () => {
  const p = new RelayProcedure();
  p.interact(false);
  p.cancelApproach();
  assert.equal(p.phase, 'idle');
  const restored = new RelayProcedure(true);
  assert.equal(restored.complete, true);
  restored.update(10, true);
  assert.equal(restored.phase, 'complete');
});

test('crew repair cannot replace a component until a real spare arrives', () => {
  const p = new RelayProcedure();
  p.interact(true);
  finishTimed(p);
  p.interact(true);
  finishTimed(p);
  assert.equal(p.phase, 'inspected');
  assert.equal(p.interact(true, false), false);
  assert.equal(p.phase, 'inspected');
  assert.equal(p.interact(true, true), true);
  assert.equal(p.phase, 'replacing');
  p.reset();
  assert.equal(p.phase, 'idle');
});
