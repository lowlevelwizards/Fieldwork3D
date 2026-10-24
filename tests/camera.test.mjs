import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cameraOffset, clampZoom, ISOMETRIC_ELEVATION, viewSize,
} from '../src/camera-model.ts';

test('a 10-meter slab is framed in portrait and landscape at default zoom', () => {
  for (const [w, h] of [[390, 844], [844, 390], [1000, 1000]]) {
    const frame = viewSize(w, h, 1);
    assert.ok(frame.width >= 16.5 - 1e-9);
    assert.ok(frame.height >= 12 - 1e-9);
  }
});
test('orbit holds isometric elevation and camera distance at every yaw', () => {
  const d = 28;
  for (const yaw of [0, Math.PI/4, Math.PI, -3*Math.PI/2]) {
    const p = cameraOffset(yaw, d);
    assert.ok(Math.abs(Math.hypot(p.x, p.y, p.z) - d) < 1e-9);
    assert.ok(Math.abs(p.y - Math.sin(ISOMETRIC_ELEVATION) * d) < 1e-9);
  }
});
test('zoom is bounded and changes orthographic size, not camera pitch', () => {
  assert.equal(clampZoom(0), 0.65);
  assert.equal(clampZoom(100), 2.5);
  assert.ok(viewSize(844, 390, 2).height < viewSize(844, 390, 1).height);
});

test('distance in the mist attenuates visibility without changing world geometry', async () => {
  const { ATMOSPHERE, visibleLightFraction } =
    await import('../src/environment-conditions.ts');
  assert.ok(ATMOSPHERE.hazeDensity > 0);
  assert.equal(visibleLightFraction(0), 1);
  assert.ok(visibleLightFraction(15) > visibleLightFraction(30));
  assert.ok(visibleLightFraction(30) > visibleLightFraction(60));
  assert.ok(visibleLightFraction(60) > 0);
});
test('light is directional, fixed, and above the ground', async () => {
  const { DAYLIGHT } = await import('../src/environment-conditions.ts');
  assert.ok(DAYLIGHT.direction.y > 0);
  assert.ok(Math.hypot(DAYLIGHT.direction.x, DAYLIGHT.direction.z) > 0);
  assert.ok(DAYLIGHT.intensity > 0);
});
