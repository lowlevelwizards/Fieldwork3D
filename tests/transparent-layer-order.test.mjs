import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('overhead translucent clouds composite after ground water and rain', () => {
  const read = name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8');
  const clouds = read('clouds.ts');
  const puddles = read('puddles.ts');
  const rain = read('rain.ts');

  // Transparent clouds use depthWrite:false, so explicit ordering prevents
  // ground puddles from being drawn visually on top of high clouds.
  const cloudOrder = Number(clouds.match(/part\.renderOrder\s*=\s*(\d+)/)?.[1]);
  const puddleOrders = [...puddles.matchAll(/(?:water|darkRim|glint)\.renderOrder\s*=\s*(\d+)/g)].map(m => Number(m[1]));
  const rainOrders = [...rain.matchAll(/(?:mesh|impacts)\.renderOrder\s*=\s*(\d+)/g)].map(m => Number(m[1]));

  assert.equal(puddleOrders.length, 3);
  assert.equal(rainOrders.length, 2);
  assert.ok(Number.isFinite(cloudOrder));
  assert.ok(puddleOrders.every(order => order < cloudOrder));
  assert.ok(rainOrders.every(order => order < cloudOrder));
  assert.match(clouds, /depthWrite:\s*false/);
  // Cloud SHADOWS belong down on the ground, not in the sky composite.
  assert.match(clouds, /shadow\.renderOrder\s*=\s*1/);
});
