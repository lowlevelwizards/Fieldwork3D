import test from 'node:test';
import assert from 'node:assert/strict';
import {roomPixelSurface,zonePixelSurface,fixturePixelSurface}
 from '../src/worldgen/pixel-surface-selection.ts';
test('floor materials follow room purpose and location',()=>{
 assert.equal(roomPixelSurface('clinic','exam'),'linoleum');
 assert.equal(roomPixelSurface('house','bedroom'),'wood');
 assert.equal(roomPixelSurface('office','meeting'),'carpet');
 assert.equal(roomPixelSurface('warehouse','loading'),'concrete');
 assert.equal(roomPixelSurface('warehouse','hall'),'concrete');
});
test('outside and fixtures reuse stable semantic materials',()=>{
 assert.equal(zonePixelSurface('parking'),'asphalt');
 assert.equal(zonePixelSurface('garden'),'earth');
 assert.equal(fixturePixelSurface('sedan'),'metal');
 assert.equal(fixturePixelSurface('sofa'),'fabric');
 assert.equal(fixturePixelSurface('pallet'),'wood');
});
