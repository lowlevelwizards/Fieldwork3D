import test from 'node:test';
import assert from 'node:assert/strict';
import {wallPixelSurface} from '../src/worldgen/pixel-surface-selection.ts';
test('walls have grounded archetype material identity',()=>{
 assert.equal(wallPixelSurface('clinic'),'plaster');
 assert.equal(wallPixelSurface('garage'),'concrete');
 assert.equal(wallPixelSurface('townhouse'),'brick');
 assert.equal(wallPixelSurface('warehouse'),'concrete');
});
