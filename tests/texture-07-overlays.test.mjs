import test from 'node:test';
import assert from 'node:assert/strict';
import {pixelOverlay,overlayForZone} from '../src/rendering/pixel-overlays.ts';
test('legacy repeating grime stays disabled, while tactical tracks remain bounded',()=>{
 for(const kind of ['dust','mud','tire']){
  const a=pixelOverlay(kind),b=pixelOverlay(kind);
  assert.equal(a.length,4096);
  assert.deepEqual(a,b);
  assert.ok(a.some((v,i)=>i%4===3&&v===0));
  if(kind==='tire')assert.ok(a.some((v,i)=>i%4===3&&v>0));
  else assert.ok(a.every((v,i)=>i%4!==3||v===0));
 }
 assert.equal(overlayForZone('occupied','parking'),null);
 assert.equal(overlayForZone('disturbed','parking'),'tire');
 assert.equal(overlayForZone('neglected','yard'),null);
});
