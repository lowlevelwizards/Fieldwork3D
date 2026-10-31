import test from 'node:test';
import assert from 'node:assert/strict';
import {propCatalog,propDefinition} from '../src/worldgen/asset-catalog.ts';
test('prop definitions are unique, dimensioned and self-consistent',()=>{
 const props=propCatalog();assert.ok(props.length>=70);
 assert.equal(new Set(props.map(a=>a.id)).size,props.length);
 for(const p of props){assert.ok(p.width>0&&p.depth>0&&p.height>0,p.id);
  assert.equal(propDefinition(p.id),p);if(!p.solid)assert.equal(p.cover,'none');}
});
