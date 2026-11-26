import test from 'node:test';
import assert from 'node:assert/strict';
import {ART_PIXEL,ART_OPERATOR_HEIGHT,wallDensity,physicalMaskIndex} from '../src/rendering/material-art-scale.ts';
import {artLuma,relativeArtColor} from '../src/rendering/material-art-contrast.ts';
import {PIXEL_WORLD_SIZE,PIXEL_SURFACES,pixelPattern} from '../src/rendering/pixel-recipes.ts';
import {materialProfile} from '../src/rendering/pixel-profiles.ts';
test('one physical art grid with explicit atlas storage density',()=>{
 assert.equal(ART_PIXEL,PIXEL_WORLD_SIZE);assert.equal(ART_OPERATOR_HEIGHT,40);
 assert.deepEqual(wallDensity(96,56,128,24),{x:.75,y:56/24,candidateWidth:96,candidateRows:56});
 assert.equal(physicalMaskIndex(.5,.5,16,16)%4,0);
});
test('substrate contrast remains bounded and changes direction on request',()=>{
 for(const base of [[70,85,95],[150,160,155],[215,225,220]]){
  for(const direction of ['light','dark']){
   const c=relativeArtColor(base,[110,110,105],.65,12,32,direction);
   const delta=artLuma(c)-artLuma(base);
   assert.ok(Math.abs(delta)>=10&&Math.abs(delta)<=34);
   assert.equal(Math.sign(delta),direction==='light'?1:-1);
  }
 }
});
test('every shared material stays within its declared contrast and alpha contract',()=>{
 for(const kind of PIXEL_SURFACES)for(let seed=0;seed<4;seed++){
  const bytes=pixelPattern(kind,seed);
  assert.ok(bytes.every((v,i)=>i%4===3?v===255:v>=255-materialProfile(kind).maxDarkening-2),kind);
 }
});
