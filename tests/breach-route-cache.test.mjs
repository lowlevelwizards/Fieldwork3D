import test from 'node:test';import assert from 'node:assert/strict';
import {DisplayRouteCache} from '../src/breach-route-cache.ts';
import {initialIntel} from '../src/breach-intel.ts';
test('unchanged planning geometry never repeats search',()=>{
  const intel=initialIntel('true-blind',undefined,[]);
  const cache=new DisplayRouteCache(),a={x:72,y:72},b={x:110,y:120};
  const first=cache.get(a,b,intel);
  for(let i=0;i<30;i++)assert.deepEqual(cache.get(a,b,intel),first);
  assert.equal(cache.computations,1);
  intel.walls.add(2);
  cache.get(a,b,intel);
  assert.equal(cache.computations,2);
});
test('cache evicts rather than accumulating unlimited route history',()=>{
  const intel=initialIntel('true-blind',undefined,[]);
  const cache=new DisplayRouteCache();
  for(let i=0;i<250;i++)cache.get({x:80+i*13,y:70},{x:100,y:135},intel);
  assert.ok(cache.computations>1);
});
