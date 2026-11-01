import test from 'node:test';
import assert from 'node:assert/strict';
import {pixelPattern} from '../src/rendering/pixel-recipes.ts';
import {fixturePixelSurface} from '../src/worldgen/pixel-surface-selection.ts';
test('finished fixtures are smooth instead of rust-speckled',()=>{
 assert.equal(fixturePixelSurface('toilet'),'porcelain');
 assert.equal(fixturePixelSurface('printer'),'plastic');
 assert.equal(fixturePixelSurface('cabinet'),'furniture-wood');
 assert.equal(fixturePixelSurface('window-boards'),'rough-wood');
 for(const kind of ['porcelain','plastic']){
  const pixels=pixelPattern(kind);
  assert.ok(pixels.every((x,i)=>i%4===3||x===255));
 }
});
