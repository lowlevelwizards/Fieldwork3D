import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('performance diagnostics expose resource counts only under opt-in meter',()=>{
 const runtime=readFileSync(new URL('../src/breach-runtime-loop.ts',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(runtime,/const perfOverlay=new URLSearchParams\(location\.search\)\.has\('perf'\)/);
 assert.match(runtime,/document\.getElementsByTagName\('\*'\)\.length/);
 assert.match(runtime,/physicalActionRings\.size/);
 assert.match(runtime,/stats\?\.siteMaterialCount/);
 assert.match(scene,/siteMaterialCount:this\.siteMaterials\.size/);
});
