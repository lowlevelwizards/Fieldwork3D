import test from 'node:test';
import assert from 'node:assert/strict';
import {pixelPattern} from '../src/rendering/pixel-recipes.ts';
import {fixturePixelSurface,fixtureComponentSurface} from '../src/worldgen/pixel-surface-selection.ts';
test('wood doors never inherit horizontal floorboard seams',()=>{
 const door=pixelPattern('door-wood'),floor=pixelPattern('wood');
 assert.notDeepEqual(door,floor);
 for(let y=0;y<32;y++){
  let dark=0;for(let x=0;x<32;x++)if(door[(y*32+x)*4]<248)dark++;
  assert.ok(dark<4,'manufactured door remains calm at every height');
 }
});
test('fine furniture and rough construction have distinct pattern scales',()=>{
 assert.notDeepEqual(pixelPattern('furniture-wood'),pixelPattern('rough-wood'));
 assert.equal(fixturePixelSurface('cabinet'),'furniture-wood');
 assert.equal(fixtureComponentSurface('pallet','body'),'rough-wood');
 assert.equal(fixtureComponentSurface('window-boards','body'),'rough-wood');
});
