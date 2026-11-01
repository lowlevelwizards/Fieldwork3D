import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {labScaleChoice,resolveLabScale} from '../src/map-lab-generation.ts';

const html=readFileSync(new URL('../map-lab.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/map-lab-main.ts',import.meta.url),'utf8');
const worker=readFileSync(new URL('../src/map-lab-worker.ts',import.meta.url),'utf8');
const site=readFileSync(new URL('../src/breach-site.ts',import.meta.url),'utf8');

test('Map Lab lists just three physical sizes and random',()=>{
 const options=html.match(/<select id="scale">([\s\S]*?)<\/select>/)?.[1]??'';
 assert.deepEqual([...options.matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]),
   ['small','medium','large','random']);
 assert.equal(labScaleChoice('standard'),'small');
 assert.equal(labScaleChoice('expanded'),'medium');
 assert.equal(labScaleChoice(null),'medium');
});
test('random size resolves to a supported reproducible tier',()=>{
 const observed=new Set();
 for(let seed=1;seed<100;seed++){
   const first=resolveLabScale('random',seed);
   assert.equal(resolveLabScale('random',seed),first);
   observed.add(first);
 }
 assert.deepEqual([...observed].sort(),['large','medium','small']);
 for(const size of ['small','medium','large'])
   assert.equal(resolveLabScale(size,123),size);
});
test('worker progress remains visible and can be cancelled and retried',()=>{
 assert.match(html,/id="generationProgress"/);
 assert.match(html,/id="progressBar"/);
 assert.match(html,/id="progressPercent"/);
 assert.match(html,/id="progressClock"/);
 assert.match(html,/id="cancelGeneration"/);
 assert.match(main,/new Worker\(new URL\('\.\/map-lab-worker\.ts',import\.meta\.url\)/);
 assert.match(main,/worker\?\.terminate\(\)/);
 assert.match(main,/requestAnimationFrame\(\(\)=>setTimeout\(resolve,0\)\)/);
 assert.match(worker,/progress\(69,'Validating generated site'/);
 assert.match(worker,/progress\(82,'Preparing site for 3D preview'/);
 assert.match(site,/onProgress\?\.\('layout',attempt\)/);
});
test('completed site is reused rather than generated three times',()=>{
 assert.match(main,/newSession\(0,site\.seed,'floor-plan',site\.scale,undefined,site\)/);
 assert.match(main,/report\(site,audit\)/);
});
