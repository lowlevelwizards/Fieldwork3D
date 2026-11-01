import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Map Lab exposes functional incompleteness overlay and interactive room audit',()=>{
 const html=readFileSync(new URL('../map-lab.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/map-lab-main.ts',import.meta.url),'utf8');
 assert.match(html,/id="needs"/);
 assert.match(html,/room-incomplete/);
 assert.match(js,/assessRoomContracts\(site\)/);
 assert.match(js,/verdict\.missing\.length/);
 assert.match(js,/needs'\)\.addEventListener\('change',updateLabels\)/);
});
