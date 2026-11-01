import test from 'node:test';
import assert from 'node:assert/strict';
import {PIXEL_SURFACES,pixelPattern} from '../src/rendering/pixel-recipes.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
import {assetPrimarySurface} from '../src/worldgen/material-inspection.ts';
import {PixelTextureLibrary,PIXEL_VARIANTS} from '../src/rendering/pixel-materials.ts';
test('all assets report a declared material and product-specific subtypes',()=>{
 for(const asset of assetLibrary())assert.ok(PIXEL_SURFACES.includes(assetPrimarySurface(asset)),asset.id);
 const all=assetLibrary();
 assert.equal(assetPrimarySurface(all.find(x=>x.id==='dumpster')),'painted-metal');
 assert.equal(assetPrimarySurface(all.find(x=>x.id==='door:wood')),'door-wood');
});
test('material pixel patterns remain physically small and cache bounded',()=>{
 const cache=new PixelTextureLibrary();
 for(const family of PIXEL_SURFACES)for(let variant=0;variant<PIXEL_VARIANTS;variant++){
  const p=pixelPattern(family,variant);
  assert.equal(p.length,4096);
  cache.get(family,variant);
 }
 assert.ok(cache.count<=PIXEL_SURFACES.length*PIXEL_VARIANTS);
 assert.ok(cache.estimatedBytes<=PIXEL_SURFACES.length*PIXEL_VARIANTS*6000);
 cache.dispose();
});
test('distinct families never regress to a common universal texture',()=>{
 assert.notDeepEqual(pixelPattern('door-wood'),pixelPattern('wood'));
 assert.notDeepEqual(pixelPattern('painted-metal'),pixelPattern('corrugated-metal'));
 assert.notDeepEqual(pixelPattern('grass'),pixelPattern('packed-earth'));
});
