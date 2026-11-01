import test from 'node:test';
import assert from 'node:assert/strict';
import {roomPixelSurface} from '../src/worldgen/pixel-surface-selection.ts';
import {buildingTheme,roomFloor} from '../src/worldgen/building-palettes.ts';
import {pixelPattern} from '../src/rendering/pixel-recipes.ts';
test('clinic maintains bright washable surfaces',()=>{
 for(const p of ['exam','treatment','waiting','reception','hall','office'])
  assert.equal(roomPixelSurface('clinic',p),'linoleum');
 assert.equal(roomPixelSurface('clinic','bathroom'),'tile');
 for(let seed=0;seed<3;seed++){
  const c=buildingTheme('clinic',seed);
  assert.ok(c.tile>=0xcfcfcf,'tile base should stay pale');
  assert.ok(roomFloor(c,'exam')>0);
 }
 const p=pixelPattern('linoleum');
 assert.ok(p.every((v,i)=>i%4===3||v>=252));
});
test('garage service bays differ from clinic and residential floors',()=>{
 assert.equal(roomPixelSurface('garage','bay'),'sealed-concrete');
 assert.equal(roomPixelSurface('house','living'),'wood');
 assert.equal(roomPixelSurface('warehouse','loading'),'concrete');
});
