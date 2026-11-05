import test from 'node:test';
import assert from 'node:assert/strict';
import {ProjectedRouteCache} from '../src/breach-plan-projection-cache.ts';

const camera=()=>({
 matrixWorld:{elements:Array.from({length:16},(_,i)=>i===0||i===5||i===10||i===15?1:0)},
 projectionMatrix:{elements:Array.from({length:16},(_,i)=>i===0||i===5||i===10||i===15?1:0)}
});
test('3D route projection is reused only at the exact same camera transform',()=>{
 const cache=new ProjectedRouteCache(),cam=camera(),route=[{x:1,y:2},{x:3,y:5}];
 let work=0;
 const project=p=>{work++;return {x:p.x*10,y:p.y*10}};
 cache.beginFrame(cam,400,800);
 const a=cache.get(route,4,project);
 const b=cache.get(route,4,project);
 assert.strictEqual(a,b);
 assert.equal(work,2,'no redundant projection');
 cache.beginFrame(cam,400,800);
 assert.strictEqual(cache.get(route,4,project),a);
 assert.equal(work,2);
 cam.matrixWorld.elements[12]=0.001;
 cache.beginFrame(cam,400,800);
 const c=cache.get(route,4,project);
 assert.notStrictEqual(c,a,'tiny camera changes invalidate');
 assert.equal(work,4);
 cache.beginFrame(cam,401,800);
 cache.get(route,4,project);assert.equal(work,6,'viewport resize invalidates');
 cache.beginFrame(cam,401,800);
 cache.get(route,8,project);assert.equal(work,8,'projection height is distinct');
 cache.get([...route],4,project);assert.equal(work,10,'edited routes invalidate');
 assert.equal(cache.hits,2);
});
test('multiple operator routes remain isolated even if coordinates match',()=>{
 const cache=new ProjectedRouteCache(),cam=camera();
 cache.beginFrame(cam,390,700);
 const sameCoordinates=()=>[{x:2,y:4},{x:6,y:8}];
 const first=sameCoordinates(),second=sameCoordinates();
 assert.notStrictEqual(cache.get(first,4,p=>p),cache.get(second,4,p=>p));
 assert.equal(cache.misses,2);
 cache.clear();
 assert.equal(cache.invalidations,2);
});
