import test from 'node:test';
import assert from 'node:assert/strict';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
import {generateSite} from '../src/breach-site.ts';
test('MAP 18 vegetation silhouettes are dimensioned and inspectable',()=>{
 for(const id of ['tree-broadleaf','tree-conifer','tree-scrub','shrub-round','shrub-tall']){
  const p=propDefinition(id);assert.ok(p?.solid&&p.height>15&&p.width>20);
  assert.equal(assetLibrary().find(x=>x.id===id)?.presentation,'bespoke');
 }
});
test('MAP 18 outdoor vegetation selection is seeded and physical',()=>{
 for(let seed=1;seed<=32;seed++){
  const a=generateSite(seed),b=generateSite(seed);
  assert.deepEqual(a.cover,b.cover);
  for(const item of a.cover.filter(x=>x.fixture?.startsWith('tree-')||
    x.fixture?.startsWith('shrub-')))
    assert.ok(propDefinition(item.fixture)?.solid);
 }
});
