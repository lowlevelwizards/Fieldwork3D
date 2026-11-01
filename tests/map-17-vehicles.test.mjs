import test from 'node:test';
import assert from 'node:assert/strict';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
import {generateSite} from '../src/breach-site.ts';
test('MAP 17 vehicle types have independent physical dimensions and catalog previews',()=>{
 const items=assetLibrary();
 for(const id of ['sedan','pickup','van','suv']){
  const p=propDefinition(id);
  assert.ok(p?.solid&&p.cover==='high');
  assert.ok(p.width>=60&&p.depth>=30);
  assert.equal(items.find(x=>x.id===id)?.presentation,'bespoke');
 }
});
test('MAP 17 parking vehicles are deterministic in seeded properties',()=>{
 let found=0;
 for(let seed=1;seed<=80;seed++){
  const a=generateSite(seed),b=generateSite(seed);
  assert.deepEqual(a.cover,b.cover);
  for(const prop of a.cover){
   if(['sedan','pickup','van','suv'].includes(prop.fixture??'')){
    found++;
    assert.equal(prop.low,false);
    assert.ok(prop.w>10&&prop.h>10);
   }
  }
 }
 assert.ok(found>0);
});
