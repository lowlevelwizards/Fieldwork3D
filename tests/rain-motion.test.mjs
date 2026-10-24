import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cloudAt } from '../src/cloud-model.ts';
import {
  RAIN_STREAK_LENGTH, rainEmissionCeiling, rainStreakHeight,
} from '../src/rain-model.ts';

test('rain always originates below every parent cloud underside', () => {
  for (let hour = 0; hour < 24; hour += .5) {
    for (let index = 0; index < 18; index++) {
      const cloud = cloudAt(index, hour);
      const ceiling = rainEmissionCeiling(cloud);
      assert.ok(ceiling >= 0.05);
      assert.ok(ceiling < cloud.y - .195 * cloud.scale);
    }
  }
});

test('as phase increases, the leading rain tip moves downward, never upward', () => {
  const cloud = cloudAt(0, 12);
  const ceiling = rainEmissionCeiling(cloud);
  let previous = Infinity;
  for (let i = 0; i <= 100; i++) {
    const phase = i / 100;
    const tip = rainStreakHeight(phase, 0, ceiling);
    assert.ok(tip < previous);
    assert.ok(tip <= ceiling);
    previous = tip;
  }
});

test('a streak trails ABOVE its falling tip but visible geometry stays below cloud', () => {
  const ceiling = rainEmissionCeiling(cloudAt(6, 16));
  for (let i = 0; i <= 100; i++) {
    const phase = i / 100;
    const tip = rainStreakHeight(phase, 0, ceiling);
    const trail = rainStreakHeight(phase, 1, ceiling);
    assert.ok(Math.abs((trail - tip) - RAIN_STREAK_LENGTH) < 1e-9);
    const renderedTip = Math.max(0.025, Math.min(ceiling, tip));
    const renderedTrail = Math.max(0.025, Math.min(ceiling, trail));
    assert.ok(renderedTip >= 0.025 && renderedTip <= ceiling);
    assert.ok(renderedTrail >= 0.025 && renderedTrail <= ceiling);
    assert.ok(renderedTrail >= renderedTip);
  }
});

test('rain shader descends and enforces both world boundary and cloud ceiling', () => {
  const source = readFileSync(new URL('../src/rain.ts', import.meta.url), 'utf8');
  assert.match(source, /ceiling\s*-\s*phase\s*\*\s*\(ceiling\s*\+\s*streakLength\)/);
  assert.match(source, /clamp\(rawHeight,\s*0\.025,\s*ceiling\)/);
  assert.match(source, /vRawHeight\s*<\s*0\.025\s*\|\|\s*vRawHeight\s*>\s*ceiling/);
  assert.match(source, /rainEmissionCeiling\(sampled\)/);
  assert.match(source, /abs\(vWorld\.x\)\s*>\s*5\.0/);
  assert.match(source, /abs\(vWorld\.z\)\s*>\s*5\.0/);
});
