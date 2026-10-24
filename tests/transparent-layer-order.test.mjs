import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('terrain-contour water composites below falling rain and overhead clouds', () => {
  const read = name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8');
  const clouds = read('clouds.ts');
  const puddles = read('puddles.ts');
  const rain = read('rain.ts');

  const cloudOrder = Number(clouds.match(/part\.renderOrder\s*=\s*(\d+)/)?.[1]);
  const waterOrder = Number(puddles.match(/this\.surface\.renderOrder\s*=\s*(\d+)/)?.[1]);
  const rainOrders = [...rain.matchAll(/(?:mesh|impacts)\.renderOrder\s*=\s*(\d+)/g)]
    .map(m => Number(m[1]));

  assert.ok(Number.isFinite(waterOrder));
  assert.equal(rainOrders.length,2);
  assert.ok(rainOrders.every(order => waterOrder < order && order < cloudOrder));
  assert.match(puddles, /depthTest:\s*true/);
  assert.match(puddles, /depthWrite:\s*false/);
  assert.match(clouds, /depthWrite:\s*false/);
  assert.match(clouds, /shadow\.renderOrder\s*=\s*1/);
});

test('standing-water shoreline clips real terrain triangles to its pond level', () => {
  const source = readFileSync(new URL('../src/puddles.ts', import.meta.url), 'utf8');
  assert.match(source, /submergedPolygon\(triangle,level\)/);
  assert.match(source, /terrainHeight\(/);
  assert.match(source, /water\.surfaceLevel\(basin\.id\)/);
  assert.doesNotMatch(source, /radiusX|radiusZ|surfaceFraction/);
});
