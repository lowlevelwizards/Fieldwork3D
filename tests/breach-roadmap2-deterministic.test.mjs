import test from 'node:test';
import assert from 'node:assert/strict';
import {runBreachScenario} from './fixtures/breach-scenario-harness.mjs';
import {activateSite,WALLS,COVER} from '../src/breach-core.ts';

test('identical authored movement scenarios replay identical simulation samples',()=>{
 for(const seed of [7,19,31]){
  const first=runBreachScenario(seed,{ticks:90});
  const second=runBreachScenario(seed,{ticks:90});
  assert.deepEqual(second,first,'divergent seeded simulation: '+seed);
  assert.equal(first.samples.length,7);
  assert.equal(first.samples[0].squad.length,4);
  assert.ok(first.samples.at(-1).seconds>first.samples[0].seconds);
  assert.ok(first.accepted.some(Boolean),'no movement orders accepted for '+seed);
 }
});
test('scenario runner releases temporary site geometry even after repeated runs',()=>{
 const originalWalls=WALLS.length,originalCover=COVER.length;
 runBreachScenario(47,{ticks:5});
 assert.equal(WALLS.length,originalWalls);
 assert.equal(COVER.length,originalCover);
 activateSite(null);
});
