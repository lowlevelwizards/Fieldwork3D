import test from 'node:test';
import assert from 'node:assert/strict';
import { NavigationGrid } from '../src/navigation/grid.ts';

test('Cedar Relay service point is approachable from the operator start', () => {
  const obstacles = [
    { kind: 'box', x: -9, z: -13, halfX: 5.4, halfZ: 3.9 },
    { kind: 'box', x: 19, z: -17, halfX: 3.3, halfZ: 2.65 },
    { kind: 'circle', x: 29, z: -19, radius: 1.5 },
    { kind: 'box', x: 12, z: 4, halfX: 3.6, halfZ: 2.2 },
    { kind: 'box', x: 1.3, z: -9.3, halfX: 0.84, halfZ: 0.55 },
    { kind: 'box', x: 5, z: -12.7, halfX: 0.56, halfZ: 0.56 },
  ];
  const nav = new NavigationGrid(obstacles);
  const stand = { x: 1.3, z: -7.87 };
  const route = nav.findPath({ x: -27, z: 10 }, stand);
  assert.ok(route.length > 0);
  assert.ok(nav.canOccupy(stand));
  assert.ok(nav.isWalkable(stand));
  assert.ok(Math.hypot(route.at(-1).x - stand.x, route.at(-1).z - stand.z) < 0.01);
  for (const waypoint of route) assert.ok(nav.isWalkable(waypoint));
});
