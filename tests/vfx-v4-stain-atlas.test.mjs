import test from 'node:test';
import assert from 'node:assert/strict';
import {STAIN_CELL,STAIN_VARIANTS,STAIN_STYLE_COUNT,BLOOD_STYLE_COUNT,stainAlphaPixels,stainVariant,damageVariant,damageRadius} from '../src/rendering/breach-stain-atlas.ts';
test('V4 deterministic splat and pool masks with padded bounds',()=>{
 const p=stainAlphaPixels(),n=STAIN_CELL;
 assert.equal(p.length,n*n*STAIN_STYLE_COUNT*4);assert.deepEqual(p,stainAlphaPixels());
 const variants=[];
 for(let v=0;v<BLOOD_STYLE_COUNT;v++){
  let nonzero=0;const alpha=[];
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const at=(y*n*STAIN_STYLE_COUNT+v*n+x)*4,a=p[at+3];alpha.push(a);
   if(a)nonzero++;
   if(Math.hypot((x+.5)/n*2-1,(y+.5)/n*2-1)>.91)assert.equal(a,0);
   assert.equal(p[at],255);
  }
  assert.ok(nonzero>n*n*.35&&nonzero<n*n*.7);
  variants.push(alpha.join(','));
 }
 assert.equal(new Set(variants).size,BLOOD_STYLE_COUNT);
});
test('V4 position-based style selection stable across seek and reorder',()=>{
 const points=[[1,2],[50.1,70],[-5,10],[0,0]];
 const a=points.map(([x,y])=>stainVariant(x,y));
 assert.deepEqual([...points].reverse().map(([x,y])=>stainVariant(x,y)).reverse(),a);
 assert.ok(a.every(v=>v>=0&&v<STAIN_VARIANTS));
});

test('V14 appends deterministic distinct dark-core and light-rim damage masks without changing blood indices',()=>{
 const n=STAIN_CELL,p=stainAlphaPixels(),styles=new Set();
 for(const surface of ['wood','stone','metal','glass','dust']){
  const base=damageVariant(surface,0,0),pair=base-(base-BLOOD_STYLE_COUNT)%2;
  assert.ok(pair>=BLOOD_STYLE_COUNT&&pair+1<STAIN_STYLE_COUNT);
  assert.ok(damageRadius(surface)>3.2);
  for(const v of [pair,pair+1]){
   const tile=[];let dark=0,light=0;
   for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const i=(y*n*STAIN_STYLE_COUNT+v*n+x)*4,a=p[i+3],lum=p[i];
    if(Math.hypot((x+.5)/n*2-1,(y+.5)/n*2-1)>.91)assert.equal(a,0);
    if(a>200&&lum<80)dark++;
    if(a>180&&lum>180)light++;
    tile.push(lum,a);
   }
   assert.ok(dark>10&&light>4,surface+' has readable core and rim');styles.add(tile.join(','));
  }
 }
 assert.equal(styles.size,10);
 assert.equal(damageVariant(undefined,0,0),-1);
 assert.equal(damageVariant('blood',0,0),-1);
});
