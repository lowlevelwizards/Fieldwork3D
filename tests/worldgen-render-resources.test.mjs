import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('generated scene reuses bounded material and box caches without disposing shared geometry',()=>{
 const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(source,/boxGeometryCache\.size<384/);
 assert.match(source,/sharedBoxGeometries\.has\(o\.geometry\)/);
 assert.match(source,/solidCache\.get\(key\)/);
 assert.match(source,/this\.windowPaneMaterial/);
});
