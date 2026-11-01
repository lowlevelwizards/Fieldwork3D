import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCounterAccess} from '../src/worldgen/service-counter-access.ts';
import {placeServiceQueues} from '../src/worldgen/service-queue-layout.ts';
const room={id:'R',kind:'room',purpose:'reception',x:0,y:0,w:190,h:160};
const counter={x:95,y:56,w:56,h:24,fixture:'reception-desk',low:true,orientation:0};
const make=(cover,doors=[])=>({rooms:[room],cover,doors,openings:[],
  spawn:[],enemies:[],objective:{x:10,y:10},extract:{x:14,y:14},
  entrance:{x:18,y:18}});
test('customer and staff access points are calculated from a real oriented counter',()=>{
 const a=inspectCounterAccess(make([counter]))[0];
 assert.deepEqual(a.customer,{x:95,y:85});
 assert.deepEqual(a.staff,{x:95,y:27});
 assert.equal(a.customerClear,true);
 assert.equal(a.staffClear,true);
 assert.equal(placeServiceQueues(make([counter])).cover.filter(o=>
   o.fixture==='queue-stanchion').length,2);
});
test('queued layouts decline if the worker side is physically occupied',()=>{
 const stock={x:95,y:27,w:28,h:18,fixture:'crate',low:true};
 const a=inspectCounterAccess(make([counter,stock]))[0];
 assert.equal(a.staffClear,false);
 assert.equal(a.customerClear,true);
 assert.equal(placeServiceQueues(make([counter,stock])).cover.filter(o=>
   o.fixture==='queue-stanchion').length,0);
});
