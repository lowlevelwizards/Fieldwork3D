import test from 'node:test';import assert from 'node:assert/strict';
import {assetPrimarySurface,assetMaterialDescription} from '../src/worldgen/material-inspection.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
test('inspector identifies actual manufactured door and dumpster body material',()=>{
 const all=assetLibrary();
 const door=all.find(x=>x.id==='door:wood');
 const dumpster=all.find(x=>x.id==='dumpster');
 assert.ok(door&&dumpster);
 assert.equal(assetPrimarySurface(door),'door-wood');
 assert.equal(assetPrimarySurface(dumpster),'painted-metal');
 assert.ok(assetMaterialDescription(dumpster).includes('lid: plastic'));
});
test('all registered library assets support material inspection',()=>{
 for(const item of assetLibrary())assert.ok(assetPrimarySurface(item),item.id);
});
