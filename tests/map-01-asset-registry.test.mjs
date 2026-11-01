import test from 'node:test';
import assert from 'node:assert/strict';
import {assetLibrary,assetLibraryCategories,assetLibraryProblems} from '../src/worldgen/asset-library.ts';
import {propCatalog} from '../src/worldgen/asset-catalog.ts';
test('MAP 01 indexes every map fixture and architectural asset',()=>{
 const all=assetLibrary(), ids=new Set(all.map(x=>x.id));
 assert.equal(ids.size,all.length);
 for(const prop of propCatalog())assert.ok(ids.has(prop.id),prop.id);
 for(const id of ['wall','floor','window','door','shutter','arch','detail:mug'])
   assert.ok(ids.has(id),id);
 assert.equal(assetLibraryProblems().length,0);
 assert.ok(assetLibraryCategories().includes('Detail'));
});
test('MAP 01 identifies generic art without suppressing it',()=>{
 const entries=assetLibrary();
 assert.equal(entries.find(x=>x.id==='vehicle')?.presentation,'bespoke');
 assert.equal(entries.find(x=>x.id==='rug')?.presentation,'bespoke');
});
