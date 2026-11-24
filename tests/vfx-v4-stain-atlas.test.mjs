import test from 'node:test';
import assert from 'node:assert/strict';
import {STAIN_CELL,STAIN_VARIANTS,stainAlphaPixels,stainVariant} from '../src/rendering/breach-stain-atlas.ts';
test('V4 deterministic four nonempty padded stylized stain masks',()=>{
 const p=stainAlphaPixels(),n=STAIN_CELL;
 assert.equal(p.length,n*n*STAIN_VARIANTS*4);assert.deepEqual(p,stainAlphaPixels());
 const variants=[];
 for(let v=0;v<STAIN_VARIANTS;v++){
  let nonzero=0;const alpha=[];
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const at=(y*n*STAIN_VARIANTS+v*n+x)*4,a=p[at+3];alpha.push(a);
   if(a)nonzero++;
   if(Math.hypot((x+.5)/n*2-1,(y+.5)/n*2-1)>.91)assert.equal(a,0);
   assert.equal(p[at],255);
  }
  assert.ok(nonzero>100&&nonzero<n*n/2);
  variants.push(alpha.join(','));
 }
 assert.equal(new Set(variants).size,STAIN_VARIANTS);
});
test('V4 position-based style selection stable across seek and reorder',()=>{
 const points=[[1,2],[50.1,70],[-5,10],[0,0]];
 const a=points.map(([x,y])=>stainVariant(x,y));
 assert.deepEqual([...points].reverse().map(([x,y])=>stainVariant(x,y)).reverse(),a);
 assert.ok(a.every(v=>v>=0&&v<STAIN_VARIANTS));
});
