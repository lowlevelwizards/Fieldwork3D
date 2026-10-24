import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceHour, clockLabel, cssColor, environmentAtHour,
  phaseAtHour, sunDirection, visibleLightFraction, wrapHour,
  DAY_LENGTH_SECONDS,
} from '../src/environment-conditions.ts';

test('clock advances continuously, wraps, and never escapes 0..24', () => {
  assert.equal(wrapHour(24), 0);
  assert.equal(wrapHour(-1), 23);
  assert.equal(advanceHour(23.5, DAY_LENGTH_SECONDS / 24), .5);
  assert.equal(advanceHour(12, 0), 12);
  assert.equal(advanceHour(0, DAY_LENGTH_SECONDS), 0);
  assert.equal(clockLabel(0), '00:00');
  assert.equal(clockLabel(24), '00:00');
  assert.equal(clockLabel(18.5), '18:30');
});
test('sun follows a smooth arc, reaches daylight and shuts off at night', () => {
  const morning = sunDirection(8);
  const noon = sunDirection(12);
  const evening = sunDirection(17);
  const night = environmentAtHour(0);
  assert.ok(morning.y > 0 && noon.y > morning.y && evening.y > 0);
  assert.ok(Math.hypot(noon.x, noon.y, noon.z) > .999);
  assert.equal(night.sunlight, 0);
  assert.equal(environmentAtHour(23).sunlight, 0);
  assert.ok(environmentAtHour(12.5).sunlight > environmentAtHour(6.3).sunlight);
});
test('fog and mist peak toward dawn, disperse by midday and return at dusk', () => {
  const dawn = environmentAtHour(5.5);
  const noon = environmentAtHour(12.5);
  const dusk = environmentAtHour(19);
  assert.ok(dawn.hazeDensity > noon.hazeDensity);
  assert.ok(dawn.mistOpacity > noon.mistOpacity);
  assert.ok(dusk.hazeDensity > noon.hazeDensity);
  assert.ok(dusk.mistOpacity > noon.mistOpacity);
  assert.ok(visibleLightFraction(30, dawn.hazeDensity) <
    visibleLightFraction(30, noon.hazeDensity));
});
test('palette and fog interpolate continuously including at midnight and keyframes', () => {
  const beforeMidnight = environmentAtHour(24 - 0.00001);
  const midnight = environmentAtHour(0);
  const afterMidnight = environmentAtHour(0.00001);
  for (const field of ['hazeDensity', 'mistOpacity', 'fillIntensity', 'sunlight']) {
    assert.ok(Math.abs(beforeMidnight[field] - midnight[field]) < 0.0001);
    assert.ok(Math.abs(afterMidnight[field] - midnight[field]) < 0.0001);
  }
  assert.equal(environmentAtHour(24).skyTop, midnight.skyTop);
  for (const field of ['skyTop', 'skyHorizon', 'hazeColor']) {
    assert.equal(beforeMidnight[field], afterMidnight[field]);
  }
  for (const hour of [4, 5.5, 6.3, 7.75, 10, 12.5, 15.6, 17.6, 18.2, 19, 20.5]) {
    const before = environmentAtHour(hour - 0.00001);
    const after = environmentAtHour(hour + 0.00001);
    assert.ok(Math.abs(before.hazeDensity - after.hazeDensity) < 0.0001);
    assert.ok(Math.abs(before.mistOpacity - after.mistOpacity) < 0.0001);
  }
});
test('all 24 hours have finite, positive atmospheric and color values', () => {
  for (let hour = 0; hour < 24; hour += .125) {
    const sample = environmentAtHour(hour);
    assert.ok(Number.isFinite(sample.sunlight));
    assert.ok(sample.sunlight >= 0);
    assert.ok(sample.fillIntensity > 0);
    assert.ok(sample.hazeDensity > 0 && sample.hazeDensity < .2);
    assert.ok(sample.mistOpacity >= 0 && sample.mistOpacity <= 1);
    assert.match(cssColor(sample.skyTop), /^#[0-9a-f]{6}$/);
    assert.match(phaseAtHour(hour), /^(night|pre-dawn|sunrise|morning|midday|afternoon|sunset|dusk)$/);
  }
});
