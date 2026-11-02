import test from 'node:test';
import assert from 'node:assert/strict';
import {wardrobePatternPixels,wardrobePatternTexture} from '../src/operator-wardrobe-patterns.ts';
import {WARDROBE_PATTERNS} from '../src/operator-wardrobe-data.ts';
import {TILE_PIXELS} from '../src/rendering/pixel-recipes.ts';
test('original camo recipes use exact shared pixel tile, repeat deterministically',()=>{
 for(const pattern of WARDROBE_PATTERNS){
  const a=wardrobePatternPixels(pattern,3),b=wardrobePatternPixels(pattern,3);
  assert.equal(a.length,TILE_PIXELS*TILE_PIXELS*4);
  assert.deepEqual(a,b);
  assert.ok(a.every(Number.isFinite));
  const tex=wardrobePatternTexture(pattern,3);
  assert.equal(tex.image.width,TILE_PIXELS);
  assert.equal(tex,wardrobePatternTexture(pattern,3));
 }
 const woodland=wardrobePatternPixels('woodland',2);
 const denim=wardrobePatternPixels('denim',2);
 assert.notDeepEqual(woodland,denim);
});
