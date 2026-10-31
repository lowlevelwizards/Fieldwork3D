import test from 'node:test';
import assert from 'node:assert/strict';
import {packInertia} from '../src/breach-gear-inertia.ts';
test('equipment follows the body without runaway springs or time debt',()=>{
 const atRest=packInertia(0,0);
 assert.equal(atRest.lean,0);
 const catching=packInertia(-200,.1);
 assert.ok(catching.lean>0);
 for(const acceleration of [-1000,-200,0,200,1000]){
   const p=packInertia(acceleration,.5);
   assert.ok(Math.abs(p.lean)<=.04);
   assert.ok(Math.abs(p.side)<=.22);
   assert.deepEqual(p,packInertia(acceleration,.5));
 }
});
