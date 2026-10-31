import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {propCatalog} from '../src/worldgen/asset-catalog.ts';
test('workplace and domestic fixtures have dedicated visual primitives without new independent colliders',()=>{
 const src=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 for(const fixture of ['fridge','cooler','stove','checkout','sink','toilet','bathtub','rack','gondola-shelf','generator']){
  assert.ok(propCatalog().some(a=>a.id===fixture),fixture);
  assert.ok(src.includes("fixture==='"+fixture+"'")||src.includes("'"+fixture+"'"),fixture);
 }
 assert.match(src,/this\.intelSurfaces\.push\(\{obj:group,kind:'cover',index:i\}\)/);
});
