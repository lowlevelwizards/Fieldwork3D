import test from 'node:test';import assert from 'node:assert/strict';
import {surfaceMood} from '../src/worldgen/surface-moods.ts';
import {generateSite} from '../src/breach-site.ts';
import {planEnvironmentalWear,WEAR_BUDGET} from '../src/worldgen/environment-wear.ts';
test('building use and property condition contribute independently to wear',()=>{
 assert.equal(surfaceMood('clinic').maintenance,'clinical');
 assert.equal(surfaceMood('garage').maintenance,'industrial');
 assert.ok(surfaceMood('clinic').wearFraction<surfaceMood('garage').wearFraction);
 for(let i=1;i<35;i++){
  const s=generateSite(i);
  assert.ok(planEnvironmentalWear(s).length<=WEAR_BUDGET[s.condition??'occupied']);
 }
});
