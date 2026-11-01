import test from 'node:test';
import assert from 'node:assert/strict';
import {propCatalog} from '../src/worldgen/asset-catalog.ts';
import {PIXEL_SURFACES} from '../src/rendering/pixel-recipes.ts';
import {fixturePixelSurface} from '../src/worldgen/pixel-surface-selection.ts';
test('every registered fixture selects a known pixel material',()=>{
 const materials=new Set(PIXEL_SURFACES);
 const entries=propCatalog();assert.ok(entries.length>50);
 for(const item of entries)assert.ok(materials.has(fixturePixelSurface(item.id)),item.id);
});
