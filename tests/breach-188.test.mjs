import test from 'node:test';
import assert from 'node:assert/strict';
import {route} from '../src/breach-core.ts';
test('188: eight-unit fallback crosses narrow physically open slit',()=>{
  const canStand=p=>p.x>=0&&p.x<=120&&p.y>=0&&p.y<=100&&
    (p.x<55||p.x>65||(p.y>39&&p.y<45));
  const from={x:16,y:40},to={x:96,y:40};
  const path=route(from,to,canStand);
  assert.ok(path.length>0,'real narrow passage should be traversable');
  for(const at of path)assert.ok(canStand(at));
});
test('188: fully closed wall is never bypassed by refined routing',()=>{
  const canStand=p=>p.x>=0&&p.x<=120&&p.y>=0&&p.y<=100&&
    (p.x<55||p.x>65);
  assert.deepEqual(route({x:16,y:40},{x:96,y:40},canStand),[]);
});
