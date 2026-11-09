import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
test('site-static decorative tile keys are computed once at creation',()=>{
  assert.match(scene,/private observedDetails:\{obj:THREE\.Object3D;position:Pt;\s*microKey:string;fineKey:string/);
  assert.equal((scene.match(/this\.observedDetails\.push\(\{obj:prop,position:/g)||[]).length,2);
  assert.equal((scene.match(/microKey:'micro:'\+Math\.floor\(detail\.x\/10\)/g)||[]).length,2);
  assert.equal((scene.match(/fineKey:'fine:'\+Math\.floor\(detail\.x\/20\)/g)||[]).length,2);
  const render=scene.slice(scene.indexOf('    for(const detail of this.observedDetails){'),
    scene.indexOf('    // Director cuts walls',scene.indexOf('    for(const detail of this.observedDetails){')));
  assert.match(render,/s\.seenGround\.has\(detail\.microKey\)/);
  assert.match(render,/s\.seenGround\.has\(detail\.fineKey\)/);
  assert.doesNotMatch(render,/Math\.floor\(p\.(?:x|y)\/(?:10|20)\)/);
});
test('a door uses its existing directly-observed sight result for the halo',()=>{
  const start=scene.indexOf('    for(const door of s.doors){');
  const end=scene.indexOf('    // Switching procedurally generated sites',start);
  const doorLoop=scene.slice(start,end);
  assert.match(doorLoop,/const directlyObserved=!personal&&liveVisibility\(s,doorCenter\(door\)\)/);
  assert.match(doorLoop,/object\.halo\.visible=[\s\S]*?\(directlyObserved\|\|/);
  assert.equal((doorLoop.match(/liveVisibility\(s,doorCenter\(door\)\)/g)||[]).length,1);
});
