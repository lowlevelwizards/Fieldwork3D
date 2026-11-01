import test from 'node:test';import assert from 'node:assert/strict';
import {wearPixels} from '../src/rendering/pixel-decals.ts';
const kinds=['oil','grease','rust','chip','crack','scratch','drip','mud',
 'footprint','mineral','fade','soot','moss','paint-peel'];
test('all specialized physical wear masks are bounded, distinct and reproducible',()=>{
 const samples=new Set();
 for(const k of kinds){
  const p=wearPixels(k,2);
  assert.deepEqual(p,wearPixels(k,2));
  assert.equal(p.length,4096);
  const alpha=Array.from({length:1024},(_,i)=>p[i*4+3]);
  assert.ok(alpha.some(a=>a>0)&&alpha.some(a=>a===0),k);
  samples.add(alpha.join(','));
 }
 assert.ok(samples.size>=9,'effects require different silhouettes');
});
