import test from 'node:test';
import assert from 'node:assert/strict';
import {pixelPattern} from '../src/rendering/pixel-recipes.ts';
import {zonePixelSurface} from '../src/worldgen/pixel-surface-selection.ts';
const occupancy=(a)=>Array.from({length:a.length/4},(_,i)=>a[i*4]).filter(x=>x<250).length/1024;
test('natural surface categories are distinct but mostly unmarked',()=>{
 for(const kind of ['grass','earth','gravel','foliage']){
  const tile=pixelPattern(kind,2);
  assert.ok(occupancy(tile)<.04,kind+' must not become dense noise');
 }
 assert.notDeepEqual(pixelPattern('grass'),pixelPattern('earth'));
 assert.notDeepEqual(pixelPattern('grass'),pixelPattern('gravel'));
 assert.equal(zonePixelSurface('garden'),'grass');
 assert.equal(zonePixelSurface('yard'),'grass');
});
test('asphalt retains uninterrupted tone with no fake grit',()=>{
 assert.equal(occupancy(pixelPattern('asphalt')),0);
});
