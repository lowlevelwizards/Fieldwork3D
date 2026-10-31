import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DisplayRouteCache} from '../src/breach-route-cache.ts';
import {initialIntel} from '../src/breach-intel.ts';
test('planning uses exact route origin; moving display uses cached bins',()=>{
 const cache=new DisplayRouteCache(),intel=initialIntel('true-blind',undefined,[]);
 const a={x:60.2,y:72.3},b={x:61,y:88};
 cache.get(a,b,intel,true);cache.get({...a,x:60.3},b,intel,true);
 assert.equal(cache.computations,2);
 cache.clear();
 cache.get(a,b,intel);cache.get({...a,x:60.3},b,intel);
 assert.equal(cache.computations,3);
});
test('diagnostic leg length comes from the shared rig geometry',()=>{
 const s=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(s,/upper:LEG_UPPER_LENGTH,lower:LEG_LOWER_LENGTH/);
 assert.doesNotMatch(s,/upper:9\.7,lower:9\.7/);
});
