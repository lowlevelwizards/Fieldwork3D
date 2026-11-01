import test from 'node:test';
import assert from 'node:assert/strict';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {CANONICAL_ASSET_DIMENSIONS} from '../src/worldgen/world-scale.ts';
import {DETAILED_FIXTURE_IDS} from '../src/worldgen/detailed-fixture-visuals.ts';
import {ROOM_CONTRACTS} from '../src/worldgen/room-contracts.ts';
import {generateSite} from '../src/breach-site.ts';
const ids=['prep-table','commercial-range','dish-station','handwash-station',
 'instrument-cart','retail-endcap','packing-station','parts-bin'];
test('every operational fixture has canonical physical dimensions and a distinct model',()=>{
 for(const id of ids){
  const item=propDefinition(id);
  assert.ok(item?.solid,id);
  assert.deepEqual([item.width,item.depth,item.height],CANONICAL_ASSET_DIMENSIONS[id],id);
  assert.ok(DETAILED_FIXTURE_IDS.has(id),'silhouette missing '+id);
 }
});
test('clinical and kitchen contracts accept activity-specific essential stations',()=>{
 assert.ok(ROOM_CONTRACTS.exam.required.some(g=>g.includes('handwash-station')));
 assert.ok(ROOM_CONTRACTS.treatment.required.some(g=>g.includes('handwash-station')));
 assert.ok(ROOM_CONTRACTS.kitchen.required.some(g=>g.includes('commercial-range')));
 assert.ok(ROOM_CONTRACTS.kitchen.required.some(g=>g.includes('dish-station')));
});
test('specialty equipment enters deterministic playable commercial and clinical maps',()=>{
 const found=new Set();
 for(const seed of [7,10,18,21,29,32]){
  const site=generateSite(seed,'expanded');
  assert.deepEqual(site.cover,generateSite(seed,'expanded').cover);
  for(const prop of site.cover)if(ids.includes(prop.fixture??''))found.add(prop.fixture);
 }
 assert.ok(found.size>=2,'specialty equipment missing from live maps: '+[...found]);
});
