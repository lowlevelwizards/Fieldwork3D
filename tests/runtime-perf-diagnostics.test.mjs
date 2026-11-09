import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('performance diagnostics expose resource counts only under opt-in meter',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(main,/const perfOverlay=new URLSearchParams\(location\.search\)\.has\('perf'\)/);
 assert.match(main,/document\.getElementsByTagName\('\*'\)\.length/);
 assert.match(main,/physicalActionRings\.size/);
 assert.match(main,/stats\?\.siteMaterialCount/);
 assert.match(scene,/siteMaterialCount:this\.siteMaterials\.size/);
});
