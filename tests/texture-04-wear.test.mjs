import test from 'node:test';
import assert from 'node:assert/strict';
import {wearPixels,wearTexelsForWorld} from '../src/rendering/pixel-decals.ts';
test('wear masks are deterministic and alpha-bounded',()=>{
 for(const kind of ['dust','stain','scrape','scuff']){
  const a=wearPixels(kind,12),b=wearPixels(kind,12);
  assert.deepEqual(a,b);
  assert.ok(a.some((v,i)=>i%4===3&&v===0));
  assert.ok(a.some((v,i)=>i%4===3&&v>0));
 }
});
test('decal pixel sizing follows world scale',()=>{
 assert.equal(wearTexelsForWorld(40),32);
 assert.equal(wearTexelsForWorld(20),16);
});
