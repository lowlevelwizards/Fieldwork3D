import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('standalone map laboratory is registered and discoverable',()=>{
 const html=readFileSync(new URL('../map-lab.html',import.meta.url),'utf8');
 const vite=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
 const breach=readFileSync(new URL('../breach.html',import.meta.url),'utf8');
 assert.match(html,/map-lab-main\.ts/);assert.match(vite,/mapLab: 'map-lab\.html'/);
 assert.match(breach,/href="\.\/map-lab\.html"/);
});
