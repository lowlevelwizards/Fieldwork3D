import test from 'node:test';
import assert from 'node:assert/strict';
import {pixelPattern} from '../src/rendering/pixel-recipes.ts';
import {wallPixelSurface} from '../src/worldgen/pixel-surface-selection.ts';
test('structural wall families differ without generic random noise',()=>{
 const plaster=pixelPattern('plaster'),block=pixelPattern('cinderblock');
 assert.ok(plaster.every((x,i)=>i%4===3||x===255));
 assert.notDeepEqual(block,pixelPattern('siding'));
 assert.notDeepEqual(block,pixelPattern('panel'));
 assert.equal(wallPixelSurface('clinic'),'plaster');
 assert.equal(wallPixelSurface('apartment'),'plaster');
 assert.equal(wallPixelSurface('utility'),'cinderblock');
 assert.equal(wallPixelSurface('motel'),'siding');
});
