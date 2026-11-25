import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {planSurfacePageCounts,uploadSurfacePages} from '../src/rendering/surface-atlas-pages.ts';
import {SRGB_BYTE_TO_LINEAR,linearToSRGBByte} from '../src/rendering/surface-color-space.ts';
import {planFloorMaskPages} from '../src/rendering/floor-surface-atlas.ts';
import {planAtlasPages} from '../src/rendering/wall-surface-atlas.ts';
test('W8 shared atlas planner preserves exact capacity, order and power-of-two bounds',()=>{
 for(let count=0;count<512;count++){
  const sizes=planSurfacePageCounts(count);
  assert.equal(sizes.reduce((a,b)=>a+b,0),count);
  assert.ok(sizes.every(n=>n<=32&&n>0&&(n&(n-1))===0));
  assert.deepEqual(planFloorMaskPages(count),sizes);
  assert.deepEqual(planAtlasPages(Array.from({length:count},(_,index)=>({index,width:64}))).map(p=>p.indices.length),sizes);
 }
 for(const bad of [-1,1.5,NaN,Infinity])assert.throws(()=>planSurfacePageCounts(bad),RangeError);
});
test('W8 dirty pages request one upload per physical texture',()=>{
 const a=new THREE.DataTexture(),b=new THREE.DataTexture();
 const versions=[a.version,b.version];
 assert.equal(uploadSurfacePages([a,b,a,b]),2);
 assert.deepEqual([a.version,b.version],versions.map(v=>v+1));
 assert.equal(uploadSurfacePages([]),0);
 a.dispose();b.dispose();
});
test('W8 common color conversion preserves all 256 byte values and clamps output',()=>{
 for(let i=0;i<256;i++)assert.equal(linearToSRGBByte(SRGB_BYTE_TO_LINEAR[i]),i);
 assert.equal(linearToSRGBByte(-1),0);assert.equal(linearToSRGBByte(2),255);
 assert.equal(linearToSRGBByte(.5),188);
});