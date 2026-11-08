import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {foliageCardPixels,FOLIAGE_TEXTURE_SIZE,FOLIAGE_CARD_FIXTURES}
  from '../src/worldgen/foliage-card-visuals.ts';

test('trees and shrubs use stable 2D pixel-alpha foliage cards, not primitive spheres/cones',()=>{
 const scene=readFileSync(new URL('../src/worldgen/fixture-visuals.ts',import.meta.url),'utf8');
 const model=readFileSync(new URL('../src/worldgen/foliage-card-visuals.ts',import.meta.url),'utf8');
 assert.ok(scene.includes('renderFoliageCardFixture(group,c,i,visualCtx)'));
 assert.ok(!scene.includes('FOLIAGE_LOBE_GEOMETRY'));
 assert.ok(!scene.includes('FOLIAGE_CONE_GEOMETRY'));
 assert.match(model,/new THREE\.PlaneGeometry\(w,h\)/);
 assert.match(model,/alphaTest:\.5/);
 assert.match(model,/THREE\.NearestFilter/);
 assert.match(model,/mesh\.castShadow=false/);
 for(const id of ['tree','tree-broadleaf','tree-conifer','tree-scrub',
  'shrub-round','shrub-tall','hedge','bush','plant'])
  assert.equal(FOLIAGE_CARD_FIXTURES.has(id),true,id);
});

test('card masks retain crisp opaque clusters and truly transparent backgrounds',()=>{
 for(const family of ['broadleaf','conifer','scrub','shrub','hedge']){
  const pixels=foliageCardPixels(family);
  assert.equal(pixels.length,FOLIAGE_TEXTURE_SIZE**2*4);
  let leaf=0,empty=0;
  for(let i=3;i<pixels.length;i+=4){
   assert.ok(pixels[i]===0||pixels[i]===255);
   if(pixels[i]===255)leaf++;else empty++;
  }
  assert.ok(leaf>220&&empty>220,family);
  assert.deepEqual(pixels,foliageCardPixels(family),'replay stable '+family);
 }
});
