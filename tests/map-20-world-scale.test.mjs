import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {propCatalog,propDefinition} from '../src/worldgen/asset-catalog.ts';
import {assetLibrary,assetLibraryProblems} from '../src/worldgen/asset-library.ts';
import {CANONICAL_ASSET_DIMENSIONS,OPERATOR_REFERENCE_HEIGHT,
 WORLD_UNITS_PER_METRE,metres} from '../src/worldgen/world-scale.ts';
import {DETAILED_FIXTURE_IDS} from '../src/worldgen/detailed-fixture-visuals.ts';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Every catalog fixture has an audited world-unit envelope and a specific model',()=>{
 const assets=propCatalog();
 assert.equal(assets.length,Object.keys(CANONICAL_ASSET_DIMENSIONS).length);
 assert.deepEqual(assetLibraryProblems(),[]);
 for(const asset of assets){
  assert.deepEqual([asset.width,asset.depth,asset.height],
    CANONICAL_ASSET_DIMENSIONS[asset.id],asset.id);
  assert.equal(assetLibrary().find(a=>a.id===asset.id)?.presentation,'bespoke',asset.id);
  assert.ok(asset.width>0&&asset.depth>0&&asset.height>0);
 }
 assert.ok(DETAILED_FIXTURE_IDS.has('rug'));
 assert.ok(DETAILED_FIXTURE_IDS.has('shipping-container'));
});
test('Operators, doorways, furniture, and vehicles use consistent absolute scale',()=>{
 assert.equal(WORLD_UNITS_PER_METRE,20);
 assert.equal(metres(OPERATOR_REFERENCE_HEIGHT),2.1);
 const car=propDefinition('sedan'),chair=propDefinition('chair');
 const table=propDefinition('dining-table'),container=propDefinition('shipping-container');
 assert.ok(car.width>=OPERATOR_REFERENCE_HEIGHT*2);
 assert.ok(car.depth>chair.width*1.7);
 assert.ok(chair.height<OPERATOR_REFERENCE_HEIGHT);
 assert.ok(table.height<OPERATOR_REFERENCE_HEIGHT*.55);
 assert.ok(container.width>car.width);
 assert.ok(propDefinition('mug').height<chair.height/3);
});
test('Neither interior nor exterior placement silently rescales asset geometry',()=>{
 const outside=source('src/worldgen/exterior-sites.ts');
 const inside=source('src/worldgen/room-furnishing.ts');
 assert.match(outside,/const w=asset.width,h=asset.depth/);
 assert.match(inside,/const w=asset.width,h=asset.depth/);
 assert.doesNotMatch(outside,/Math.min\(asset.width/);
 assert.doesNotMatch(inside,/Math.min\(asset.width/);
});
test('Lab previews include a real-world operator comparison and architecture samples',()=>{
 const lab=source('src/asset-lab-main.ts');
 assert.match(lab,/refreshScaleGuides\(shown\)/);
 assert.match(lab,/refreshArchitectureSamples\(shown\)/);
 assert.match(lab,/metres\(v\).toFixed\(2\)/);
});
