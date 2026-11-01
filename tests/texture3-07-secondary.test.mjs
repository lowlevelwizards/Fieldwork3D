import test from 'node:test';import assert from 'node:assert/strict';
import {pixelPattern} from '../src/rendering/pixel-recipes.ts';
test('textile, molded plastic and rubber have coherent and distinct markings',()=>{
 for(const kind of ['woven-fabric','molded-plastic','tire-rubber']){
  const p=pixelPattern(kind);
  const unique=new Set(Array.from({length:p.length/4},(_,i)=>p[i*4]));
  assert.ok(unique.size>=2&&unique.size<=3,kind);
 }
 assert.notDeepEqual(pixelPattern('tire-rubber'),pixelPattern('rubber'));
 assert.notDeepEqual(pixelPattern('woven-fabric'),pixelPattern('fabric'));
});
