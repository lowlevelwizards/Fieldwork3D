import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Map Lab can launch its selected deterministic seed into tactical gameplay',()=>{
 const html=readFileSync(new URL('../map-lab.html',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../src/map-lab-main.ts',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(html,/id="playSite"/);
 assert.match(lab,/playSite\.href='\.\/breach\.html\?seed='/);
 assert.match(main,/startupParams\.has\('seed'\)/);
 assert.match(main,/requestedSeed<=0xffffffff/);
});
