import test from 'node:test';
import assert from 'node:assert/strict';
import {wallPixelSurface} from '../src/worldgen/pixel-surface-selection.ts';
test('walls have grounded archetype material identity',()=>{
 assert.equal(wallPixelSurface('clinic'),'plaster');
 assert.equal(wallPixelSurface('garage'),'cinderblock');
 assert.equal(wallPixelSurface('townhouse'),'plaster');
 assert.equal(wallPixelSurface('warehouse'),'panel');
});
