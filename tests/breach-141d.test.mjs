import test from 'node:test';
import assert from 'node:assert/strict';
import {visionPolygon} from '../src/breach-vision-polygon.ts';
test('141D: continuous cone ray terminates against walls',()=>{
  const origin={x:100,y:100},wall={a:{x:130,y:60},b:{x:130,y:140}};
  const blocked=visionPolygon(origin,0,100,[wall],[],false,[]);
  const clear=visionPolygon(origin,0,100,[],[],false,[]);
  const middle=p=>p.slice(1).filter(v=>Math.abs(v.y-100)<.01)
    .reduce((best,v)=>Math.min(best,v.x),Infinity);
  assert.ok(middle(blocked)<132);
  assert.ok(middle(clear)>195);
  assert.ok(blocked.length>70);
});
test('141D: cone advances in expected direction',()=>{
  const points=visionPolygon({x:100,y:100},Math.PI/2,40,[],[],false,[]);
  assert.ok(points.every((p,i)=>i===0||p.y>=100));
});