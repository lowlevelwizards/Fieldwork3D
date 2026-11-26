import test from 'node:test';
import assert from 'node:assert/strict';
import {WALL_EFFECTS,WALL_FINISHES,WALL_WITNESSES,wallSample,samplePixels} from '../src/wall-material-lab-samples.ts';
import {bakedWallSurfacePixels,wallSurfacePixels} from '../src/worldgen/wall-surface-recipe.ts';
import {referenceWallPixels} from '../src/wall-material-lab-reference.ts';
test('MA3 base finishes change without changing opaque atlas dimensions',()=>{
 for(const i of WALL_FINISHES.keys()){
  const recipe=wallSample(i);
  const p=samplePixels(recipe,0);
  assert.equal(p.bytes.length,128*24*4);
  assert.ok(p.bytes.every((v,j)=>j%4!==3||v===255));
  assert.notDeepEqual(p.bytes,referenceWallPixels(recipe,0,p.width,p.height),WALL_FINISHES[i].name);
 }
});
test('MA4 all effects preserve zero condition, thresholds, isolation, determinism and anchor bounds',()=>{
 for(const kind of WALL_EFFECTS){
  const w=WALL_WITNESSES[kind],r=wallSample(w.finish,[kind]);
  for(const [width,height] of [[128,24],[96,56]]){
   const clean=bakedWallSurfacePixels(r,0,width,height);
   assert.deepEqual(bakedWallSurfacePixels(r,w.event.threshold-1,width,height),clean,kind);
   const aged=bakedWallSurfacePixels(r,100,width,height);
   assert.notDeepEqual(aged,clean,kind);
   assert.deepEqual(aged,bakedWallSurfacePixels(r,100,width,height),kind);
   assert.deepEqual(clean,bakedWallSurfacePixels(r,100,width,height,'none'),kind);
   const mask=wallSurfacePixels(r,100,width,height);
   const e=r.events[0];let n=0;
   for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(mask[(y*width+x)*4+3]){
    n++;assert.ok(Math.abs((x+.5)/width*r.length-e.x)<=Math.max(1,e.width/2)+1e-8,kind);
    assert.ok(Math.abs((y+.5)/height*r.height-e.y)<=Math.max(1,e.height/2)+1e-8,kind);
   }
   assert.ok(n>0,kind);
  }
 }
});
test('stable seed changes selected graphic silhouettes, not clean base',()=>{
 let varied=0;
 for(const kind of WALL_EFFECTS){
  const r=wallSample(WALL_WITNESSES[kind].finish,[kind]);
  const a={...r,artSeed:1},b={...r,artSeed:23};
  assert.deepEqual(samplePixels(a,0).bytes,samplePixels(b,0).bytes);
  if(!Buffer.from(samplePixels(a,100).bytes).equals(Buffer.from(samplePixels(b,100).bytes)))varied++;
 }
 assert.ok(varied>=9);
});
