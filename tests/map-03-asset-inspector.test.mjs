import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
test('MAP 03 visual inspector controls inspect live geometry and flag generic models',()=>{
 const html=readFileSync(new URL('../asset-lab.html',import.meta.url),'utf8');
 const code=readFileSync(new URL('../src/asset-lab-main.ts',import.meta.url),'utf8');
 for(const id of ['bounds','focus','review'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(code,/new THREE\.EdgesGeometry\(/);
 assert.match(code,/outline\.geometry\.dispose\(/);
 assert.match(code,/stage\.view\.focus=/);
 assert.ok(code.includes("a.presentation==='shared-shape'"));
 assert.ok(assetLibrary().some(a=>a.presentation==='shared-shape'));
});
