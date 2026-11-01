import test from 'node:test';
import assert from 'node:assert/strict';
import {pixelPattern,pixelRepeats,PIXEL_SURFACES,
 TEXELS_PER_OPERATOR,TILE_WORLD_SIZE} from '../src/rendering/pixel-recipes.ts';
test('pixel recipes are deterministic, opaque and bounded',()=>{
 for(const kind of PIXEL_SURFACES){
  const a=pixelPattern(kind,7),b=pixelPattern(kind,7);
  assert.equal(a.length,32*32*4);
  assert.deepEqual(a,b);
  for(let i=0;i<a.length;i+=4){
   assert.equal(a[i],a[i+1]);assert.equal(a[i],a[i+2]);
   assert.equal(a[i+3],255);
  }
 }
});
test('recipes have material-specific construction',()=>{
 assert.notDeepEqual(pixelPattern('wood',1),pixelPattern('tile',1));
 assert.notDeepEqual(pixelPattern('brick',1),pixelPattern('metal',1));
 assert.notDeepEqual(pixelPattern('wood',1),pixelPattern('wood',2));
});
test('physical texel density is independent of object dimensions',()=>{
 assert.equal(TEXELS_PER_OPERATOR,32);
 assert.deepEqual(pixelRepeats(TILE_WORLD_SIZE*2,TILE_WORLD_SIZE/2),[2,.5]);
 assert.deepEqual(pixelRepeats(0,-10),[0,0]);
 assert.throws(()=>pixelPattern('wood',0,15));
});
