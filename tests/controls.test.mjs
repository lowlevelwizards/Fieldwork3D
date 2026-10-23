import test from 'node:test';
import assert from 'node:assert/strict';
import { initialViewHeight, maxViewHeight, screenToGround, stickAxis, stickZone } from '../src/input/control-math.ts';

test('stick centers with deadzone and clamps magnitude', () => {
  assert.deepEqual(stickAxis(2, -3), { x: 0, y: 0 });
  const up = stickAxis(0, -54);
  assert.ok(up.y > 0.99 && up.x === 0);
  assert.ok(Math.hypot(...Object.values(stickAxis(200, 200))) <= 1.001);
});

test('camera-relative movement rotates without stretching vectors', () => {
  const straight = screenToGround({ x: 0, y: 1 }, 0);
  assert.ok(Math.abs(straight.z + 1) < 0.0001);
  const right = screenToGround({ x: 1, y: 0 }, Math.PI / 2);
  assert.ok(Math.abs(right.z + 1) < 0.0001);
  for (const yaw of [0, Math.PI / 3, Math.PI, 7]) {
    const d = screenToGround({ x: 0.6, y: 0.8 }, yaw);
    assert.ok(Math.abs(Math.hypot(d.x, d.z) - 1) < 0.00001);
  }
});

test('landscape view has bounded fit and portrait does not stretch scene', () => {
  assert.ok(initialViewHeight(2.25) <= maxViewHeight(2.25));
  assert.ok(initialViewHeight(0.5) <= maxViewHeight(0.5));
  assert.ok(initialViewHeight(0.5) > initialViewHeight(2.25));
  assert.ok(maxViewHeight(2.25) < maxViewHeight(0.5));
});

test('floating thumb zones leave upper scene free for taps and pans', () => {
  assert.equal(stickZone(100, 100, 400, 800), null);
  assert.equal(stickZone(50, 600, 400, 800), 'left');
  assert.equal(stickZone(340, 600, 400, 800), 'right');
});
