import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixtureFrameTransform} from '../src/rendering/fixture-frame-transform.ts';

test('static fixtures retain their true world positions every frame',()=>{
 for(const [x,y] of [[185,235],[590,412],[22,1007]]){
  const before={x,y,w:62,h:28,orientation:0};
  const value=fixtureFrameTransform(before,{...before});
  assert.deepEqual(value,{x,y,scaleX:1,scaleY:1,scaleZ:1});
 }
});
test('rotated fixtures preserve world footprints and never translate toward origin',()=>{
 const before={x:430,y:170,w:24,h:76,orientation:1};
 assert.deepEqual(fixtureFrameTransform(before,{
  x:465,y:182,w:36,h:38,destroyed:true
 }),{
  x:465,y:182,scaleX:.5,scaleY:.32,scaleZ:1.5
 });
 assert.deepEqual(fixtureFrameTransform({...before,orientation:3},{
  x:430,y:170,w:24,h:76
 }),{x:430,y:170,scaleX:1,scaleY:1,scaleZ:1});
});
test('the shared 3D scene uses the corrected transform for both Map Lab and gameplay',()=>{
 const code=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(code,/const transform=fixtureFrameTransform\(before,current\)/);
 assert.match(code,/group\.position\.set\(transform\.x,0,transform\.y\)/);
 assert.doesNotMatch(code,/current\.x-before\.x\+before\.x\*\(1-sx\)/);
});
