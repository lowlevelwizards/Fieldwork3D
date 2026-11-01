import test from 'node:test';
import assert from 'node:assert/strict';
import {pixelOverlay,overlayForZone} from '../src/rendering/pixel-overlays.ts';
test('weathering and tire tracks are deterministic bounded overlays',()=>{
 for(const kind of ['dust','mud','tire']){
  const a=pixelOverlay(kind);assert.equal(a.length,4096);
  assert.deepEqual(a,pixelOverlay(kind));
  assert.ok(a.some((v,i)=>i%4===3&&v===0));
  assert.ok(a.some((v,i)=>i%4===3&&v>0));
 }
 assert.equal(overlayForZone('occupied','parking'),null);
 assert.equal(overlayForZone('disturbed','parking'),'tire');
 assert.equal(overlayForZone('neglected','yard'),'dust');
});
