import test from 'node:test';import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {wallExposure,planExposureWear} from '../src/worldgen/wear-exposure.ts';
test('exposure references real surfaces and is repeatable',()=>{
 for(let seed=1;seed<=40;seed++){
  const s=generateSite(seed);
  assert.deepEqual(planExposureWear(s),planExposureWear(s));
  assert.ok(planExposureWear(s).length<=11);
  s.walls.forEach((_,i)=>assert.ok([-1,1].includes(wallExposure(s,i).side)));
 }
});
