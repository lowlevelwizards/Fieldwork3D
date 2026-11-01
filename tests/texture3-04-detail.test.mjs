import test from 'node:test';import assert from 'node:assert/strict';
import {pixelPattern} from '../src/rendering/pixel-recipes.ts';
const count=(a)=>Array.from({length:a.length/4},(_,i)=>a[i*4]).filter(x=>x<255).length;
test('surface richness is sparse, not uniform random speckle',()=>{
 for(const k of ['plaster','asphalt','fabric','carpet','linoleum']){
  const a=pixelPattern(k,3);
  assert.ok(count(a)>0,k+' missing authored detail');
  assert.ok(count(a)<80,k+' has too much fine detail');
 }
 assert.ok(count(pixelPattern('porcelain'))===0);
});
