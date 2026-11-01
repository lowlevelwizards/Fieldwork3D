import test from 'node:test';
import assert from 'node:assert/strict';
import {PIXEL_SURFACES,pixelPattern} from '../src/rendering/pixel-recipes.ts';
import {overlayForZone} from '../src/rendering/pixel-overlays.ts';
test('clean painted, outdoor and fabric materials preserve authored palette',()=>{
 for(const kind of ['plaster','concrete','metal','fabric','carpet','asphalt','earth','foliage','paper']){
  const p=pixelPattern(kind,19);
  const shades=new Set(Array.from({length:p.length/4},(_,i)=>p[i*4]));
  assert.ok(shades.size<=2,kind+' should not contain mottled noise');
  assert.ok(Math.min(...shades)>=245,kind+' must not darken palette');
 }
});
test('all recipes are opaque, deterministic, and correctly sized',()=>{
 for(const kind of PIXEL_SURFACES){
  const a=pixelPattern(kind,17),b=pixelPattern(kind,17);
  assert.deepEqual(a,b);
  assert.equal(a.length,32*32*4);
  for(let i=3;i<a.length;i+=4)assert.equal(a[i],255);
 }
});
test('normal exterior zones no longer receive repeating grime',()=>{
 for(const condition of ['occupied','busy','vacant','neglected','renovation'])
  for(const zone of ['yard','garden','parking','driveway','service'])
   assert.equal(overlayForZone(condition,zone),null);
});
