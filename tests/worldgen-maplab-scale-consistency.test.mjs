import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Map Lab size labels express true physical dimensions, not old room counts',()=>{
 const html=file('map-lab.html'),code=file('src/map-lab-main.ts');
 assert.match(html,/Compact · full architecture/);
 assert.match(html,/Expanded · full architecture/);
 assert.doesNotMatch(html,/Compact \(3–4\)|Expanded \(6\+\)/);
 assert.match(code,/const siteScale=\(\)=>scaleInput.value==='expanded'/);
 assert.match(code,/const candidate=generateSite\(\(starting\+step\)>>>0,/);
 assert.match(code,/siteScale\(\)==='expanded'/);
});
