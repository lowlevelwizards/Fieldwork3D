import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAR_TEXTURE_KINDS,WEAR_VARIANTS,wearPixels,wearVariant} from '../src/rendering/pixel-decals.ts';
test('all twenty new masks are distinct, deterministic and bounded',()=>{
 const kinds=new Set();
 for(const kind of WEAR_TEXTURE_KINDS){
  const shapes=new Set();
  for(let seed=0;seed<WEAR_VARIANTS;seed++){
   const p=wearPixels(kind,seed);
   assert.equal(p.length,4096);
   assert.deepEqual(p,wearPixels(kind,seed));
   assert.deepEqual(p,wearPixels(kind,seed+WEAR_VARIANTS));
   const a=Array.from(p).filter((_,i)=>i%4===3);
   assert.ok(a.some(x=>x===0)&&a.some(x=>x>0),kind);
   assert.ok(a.filter(x=>x>0).length<1024*.8,kind);
   shapes.add(a.join(','));
   if(seed===0)kinds.add(a.join(','));
  }
  // Symmetrical motifs may use reflected twins; seed still supplies
  // deliberate variation across the shared library.
  assert.ok(shapes.size>=2,kind);
 }
 assert.equal(kinds.size,20);
 for(let i=0;i<200;i++)assert.ok(wearVariant('floor:'+i)>=0&&wearVariant('floor:'+i)<WEAR_VARIANTS);
});
