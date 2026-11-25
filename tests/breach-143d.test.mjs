import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {visionPolygon} from '../src/breach-vision-polygon.ts';
test('143D: sight mask still obeys solid wall occlusion',()=>{
  const wall={a:{x:130,y:60},b:{x:130,y:140}};
  const points=visionPolygon({x:100,y:100},0,90,[wall],[],false,[]);
  const center=points.slice(1).filter(p=>Math.abs(p.y-100)<.01);
  assert.ok(center.length>0);
  assert.ok(center.every(p=>p.x<=131));
});
test('143D: fog uses opaque concealment and temporal updates in both views',()=>{
  const root=new URL('../src/',import.meta.url);
  const mask=readFileSync(new URL('breach-fog-mask.ts',root),'utf8');
  const plan=readFileSync(new URL('breach-2d-visibility-renderer.ts',root),'utf8');
  const scene=readFileSync(new URL('breach-3d.ts',root),'utf8');
  assert.match(mask,/UNKNOWN_FOG_COLOR='#122022'/);
  assert.match(mask,/globalCompositeOperation='destination-out'/);
  assert.match(mask,/ctx\.filter='none'/);
  assert.match(plan,/fogRefresh\.poll\(state,dt,\.055/);
  assert.match(scene,/fogRefresh\.poll\(s,dt,this\.quality\.mode==='quality'\?\.055:\.10/);
});