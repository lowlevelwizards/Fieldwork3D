import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('H5.7 covered ACH/MICH retains solid protective shell instead of substituting liner',()=>{
 const src=readFileSync(new URL('../src/operator-wardrobe-head-visuals.ts',import.meta.url),'utf8');
 assert.match(src,/child\.userData\.achMichInterior===true\?\s*shellCovered:true/);
 assert.doesNotMatch(src,/child\.userData\.achMichInterior===true\?\s*shellCovered:!shellCovered/);
});
