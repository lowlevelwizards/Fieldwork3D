import test from 'node:test';import assert from 'node:assert/strict';
import {pixelPattern} from '../src/rendering/pixel-recipes.ts';
import {zonePixelSurface} from '../src/worldgen/pixel-surface-selection.ts';
test('maintained and neglected grounds have contextual construction',()=>{
 assert.equal(zonePixelSurface('garden','occupied'),'grass');
 assert.equal(zonePixelSurface('garden','neglected'),'scruffy-grass');
 assert.equal(zonePixelSurface('parking','disturbed'),'worn-asphalt');
 assert.equal(zonePixelSurface('parking','occupied'),'asphalt');
 for(const kind of ['scruffy-grass','worn-asphalt','packed-earth']){
  const p=pixelPattern(kind);let occupied=0;
  for(let i=0;i<p.length;i+=4)if(p[i]<250)occupied++;
  assert.ok(occupied>0&&occupied<90,kind);
 }
});
