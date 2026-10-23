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
  const stand = { x: 1.3, z: -7.98 };
  const route = nav.findPath({ x: -27, z: 10 }, stand);
  assert.ok(route.length > 0);
  assert.ok(nav.canOccupy(stand));
  assert.ok(nav.isWalkable(stand));
  assert.ok(Math.hypot(route.at(-1).x - stand.x, route.at(-1).z - stand.z) < 0.01);
  for (const waypoint of route) assert.ok(nav.isWalkable(waypoint));
});

test('two-person incident: service approach, depot pickup, handoff and return all route', () => {
  const obstacles = [
    { kind: 'box', x: -9, z: -13, halfX: 5.4, halfZ: 3.9 },
    { kind: 'box', x: 19, z: -17, halfX: 3.3, halfZ: 2.65 },
    { kind: 'circle', x: 29, z: -19, radius: 1.5 },
    { kind: 'box', x: 12, z: 4, halfX: 3.6, halfZ: 2.2 },
    { kind: 'box', x: 1.3, z: -9.3, halfX: 0.84, halfZ: 0.55 },
    { kind: 'box', x: 8, z: 7, halfX: 0.96, halfZ: 0.70 },
    { kind: 'box', x: 5, z: -12.7, halfX: 0.56, halfZ: 0.56 },
  ];
  const nav = new NavigationGrid(obstacles);
  const startRook = { x: 10.7, z: 10.15 };
  const startMica = { x: 8.2, z: 10.8 };
  const service = { x: 1.3, z: -7.98 };
  const pickup = { x: 7.7, z: 8.4 };
  const receiver = { x: service.x + 1.12, z: service.z + 0.24 };
  const homeRook = { x: 10.7, z: 8.9 };
  const homeMica = { x: 8.0, z: 8.5 };
  for (const [from,to] of [
    [startRook, service], [startMica, pickup], [pickup, receiver],
    [receiver, homeMica], [service, homeRook]
  ]) {
    assert.ok(nav.canOccupy(from), 'starting point needs clearance');
    assert.ok(nav.canOccupy(to), 'goal point needs clearance');
    const path = nav.findPath(from, to);
    assert.ok(path.length > 0, 'a real traversable route exists');
    assert.ok(Math.hypot(path.at(-1).x - to.x, path.at(-1).z - to.z) <= 1);
  }
});
