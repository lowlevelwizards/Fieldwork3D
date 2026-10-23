import assert from 'node:assert/strict';
import test from 'node:test';
import { NavigationGrid } from '../src/navigation/grid.ts';

test('open ground can be traversed directly', () => {
  const nav = new NavigationGrid([], 1, 24, 24);
  const path = nav.findPath({ x: -8, z: -8 }, { x: 8, z: 8 });
  assert.ok(path.length > 0);
  assert.ok(Math.hypot(path.at(-1).x - 8, path.at(-1).z - 8) < 0.01);
});

test('solid buildings cannot be crossed', () => {
  const nav = new NavigationGrid([{ kind: 'box', x: 0, z: 0, halfX: 3, halfZ: 3 }], 1, 30, 30);
  const path = nav.findPath({ x: -9, z: 0 }, { x: 9, z: 0 });
  assert.ok(path.length > 1);
  for (const point of path) assert.equal(nav.isWalkable(point), true);
  const route = [{ x: -9, z: 0 }, ...path];
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i];
    for (let step = 0; step <= 60; step++) {
      const t = step / 60;
      assert.ok(nav.isWalkable({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }));
    }
  }
});

test('taps inside obstacles snap to adjacent walkable ground', () => {
  const nav = new NavigationGrid([{ kind: 'circle', x: 3, z: 0, radius: 2 }], 1, 24, 24);
  const path = nav.findPath({ x: -5, z: 0 }, { x: 3, z: 0 });
  assert.ok(path.length > 0);
  assert.ok(nav.isWalkable(path.at(-1)));
});

test('out-of-bounds destinations find an in-bounds landing', () => {
  const nav = new NavigationGrid([], 1, 24, 24);
  const path = nav.findPath({ x: 0, z: 0 }, { x: 100, z: 100 });
  assert.equal(path.length, 0);
});

test('continuous movement respects exact obstacle and map clearance', () => {
  const nav = new NavigationGrid([
    { kind: 'circle', x: 2.5, z: -1, radius: 1.5 },
    { kind: 'box', x: -4, z: 3, halfX: 2, halfZ: 1.2 },
  ], 1, 24, 24);
  assert.equal(nav.canOccupy({ x: 2.5, z: -1 }), false);
  assert.equal(nav.canOccupy({ x: 3.9, z: -1 }), false);
  assert.equal(nav.canOccupy({ x: -4, z: 4.4 }), false);
  assert.equal(nav.canOccupy({ x: 0, z: 0 }), true);
  assert.equal(nav.canOccupy({ x: 12, z: 0 }), false);
});
