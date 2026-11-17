/** E6.22: repeatable Node model-authoring work proxy.
 * Captures wall-clock measurements for guidance only; no FPS claim.
 */
import * as THREE from 'three';
import {performance} from 'node:perf_hooks';
import {StaticVisualTemplateLibrary} from '../../src/rendering/fieldwork-visual-template-library.ts';
import {buildArchitecturalOpeningTemplate}
 from '../../src/rendering/breach-site-openings-builder.ts';

const widths=[48,56,64,72],kind='wide',N=200;
const cache=new StaticVisualTemplateLibrary();
let coldStart=performance.now();
const first=[];
for(let i=0;i<N;i++){
 const w=widths[i%widths.length],key='architectural-opening:v1:'+kind+':'+w;
 first.push(cache.acquire(key,
  ()=>buildArchitecturalOpeningTemplate(w,kind),{compile:true}));
}
let firstMs=performance.now()-coldStart;
let warmStart=performance.now();
const warm=[];
for(let i=0;i<N;i++){
 const w=widths[i%widths.length],key='architectural-opening:v1:'+kind+':'+w;
 warm.push(cache.acquire(key,
  ()=>buildArchitecturalOpeningTemplate(w,kind),{compile:true}));
}
let warmMs=performance.now()-warmStart;
const result={schema:'fieldwork-e6.22-architectural-template-node-v1',
 samplesPerPhase:N,uniqueRecipes:widths.length,
 firstMs:+firstMs.toFixed(2),warmMs:+warmMs.toFixed(2),
 cache:cache.stats()};
if(result.cache.builds!==widths.length||result.cache.hits!==2*N-widths.length||
 result.cache.leases!==2*N)throw Error('Expected reusable recipe cache unavailable');
for(const l of [...first,...warm])l.release();
cache.clear();
if(cache.stats().geometries!==0)throw Error('Template geometry leaked after clear');
console.log('E6_22_ARCH_TEMPLATE_BENCH',JSON.stringify(result));
