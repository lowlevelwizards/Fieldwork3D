import test from 'node:test';import assert from 'node:assert/strict';
import {PIXEL_SURFACES} from '../src/rendering/pixel-recipes.ts';
import {canWear,materialProperties,wearSubstrateColor} from '../src/worldgen/material-properties.ts';
test('all materials have complete physically plausible visual reactions',()=>{
 for(const s of PIXEL_SURFACES){
  const p=materialProperties(s);
  assert.ok(p.allowed.length>0,s);
  for(const n of ['porosity','corrosion','scratch','moisture','dirtRetention','roughness'])
   assert.ok(p[n]>=0&&p[n]<=1,s+' '+n);
  assert.ok(Number.isInteger(wearSubstrateColor(s)));
 }
 assert.ok(canWear('painted-metal','rust'));
 assert.ok(!canWear('porcelain','rust'));
 assert.ok(canWear('concrete','oil'));
 assert.ok(!canWear('fabric','chip'));
 assert.ok(canWear('wood','crack'));
});
