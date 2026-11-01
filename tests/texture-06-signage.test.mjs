import test from 'node:test';
import assert from 'node:assert/strict';
import {pixelSign,PIXEL_SIGN_KINDS} from '../src/rendering/pixel-signage.ts';
test('all signage motifs are deterministic, opaque and distinct',()=>{
 for(const kind of PIXEL_SIGN_KINDS){
  const a=pixelSign(kind,3);assert.equal(a.length,4096);
  assert.deepEqual(a,pixelSign(kind,3));
  for(let i=3;i<a.length;i+=4)assert.equal(a[i],255);
 }
 assert.notDeepEqual(pixelSign('exit'),pixelSign('noticeboard'));
});
