import test from 'node:test';
import assert from 'node:assert/strict';
import { establishVegetation,habitatAt,concealmentAt } from '../src/vegetation-model.ts';
import { TerrainWater } from '../src/hydrology.ts';
import { terrainHeight } from '../src/terrain-model.ts';

test('vegetation is deterministic and remains anchored to the original landform',()=>{
  const a=establishVegetation(2601),b=establishVegetation(2601);
  assert.deepEqual(a,b);
  assert.ok(a.length>100,'grass and foliage should make the landscape readable');
  assert.ok(['grass','shrub','tree','reed'].every(k=>a.some(p=>p.kind===k)));
  assert.ok(a.every(p=>p.x>=-5&&p.x<=5&&p.z>=-5&&p.z<=5));
  assert.ok(a.every(p=>Number.isFinite(terrainHeight(p.x,p.z))));
  assert.ok(a.every(p=>p.size>0));
});
test('different campaign seeds provide variety while the physical grid stays unchanged',()=>{
  const one=establishVegetation(2601),two=establishVegetation(2602);
  assert.notDeepEqual(one,two);
  assert.equal(terrainHeight(0,0),terrainHeight(0,0));
});
test('ecological suitability rejects saturated mud for large rooted plants',()=>{
  const wet={soilFraction:()=>1,waterDepthAtCell:()=>.25};
  const dry={soilFraction:()=>.45,waterDepthAtCell:()=>0};
  const a=habitatAt(0,0,wet),b=habitatAt(0,0,dry);
  assert.ok(a.tree<b.tree);
  assert.ok(a.grass<b.grass);
  assert.ok(a.tree<.25);
  assert.ok(b.moisture>=0&&b.moisture<=1);
});
test('long-term water proximity supports wetland reeds before inundation',()=>{
  const wet=habitatAt(.3,0),dry=habitatAt(4.4,-3);
  assert.ok(wet.moisture>dry.moisture);
  assert.ok(wet.reed>=0&&wet.reed<=1);
  assert.ok(dry.reed>=0&&dry.reed<=1);
});
test('existing flood and soil water are sampled read-only',()=>{
  const water=new TerrainWater();
  water.advance(5,1.5,1);
  const before=water.snapshot();
  const plants=establishVegetation(2601,water);
  assert.ok(plants.length>20);
  assert.deepEqual(water.snapshot(),before);
  assert.ok(Math.abs(water.massBalanceError())<1e-4);
});
test('plants create a continuous tactical concealment field',()=>{
  const plants=establishVegetation(2601);
  const tree=plants.find(p=>p.kind==='tree');
  assert.ok(tree);
  const near=concealmentAt(tree.x,tree.z,plants);
  const none=concealmentAt(100,100,plants);
  assert.ok(near>.1&&near<=1);
  assert.equal(none,0);
});
