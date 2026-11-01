import test from 'node:test';
import assert from 'node:assert/strict';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
import {generateSite} from '../src/breach-site.ts';
test('MAP 19 street and service furniture has real dimensions and matching previews',()=>{
 const ids=['mailbox','trash-bin','bollard','hydrant','utility-cabinet',
   'parking-block','parking-sign','street-lamp','bike-rack'];
 const catalog=assetLibrary();
 for(const id of ids){
  const p=propDefinition(id);
  assert.ok(p?.solid&&p.height>0,p?.id??id);
  assert.ok(catalog.find(x=>x.id===id&&x.presentation==='bespoke'));
 }
});
test('MAP 19 exterior placement is deterministic',()=>{
 for(let seed=1;seed<=30;seed++){
   const a=generateSite(seed),b=generateSite(seed);
   assert.deepEqual(a.cover,b.cover);
 }
});
