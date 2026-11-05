import test from 'node:test';
import assert from 'node:assert/strict';
import {RouteOpenHeap} from '../src/breach-route-heap.ts';

test('A* heap uses stable f ordering including exact ties',()=>{
 const heap=new RouteOpenHeap();
 const nodes=[
  {col:0,row:0,g:0,f:8},{col:1,row:0,g:1,f:2},
  {col:2,row:0,g:2,f:2},{col:3,row:0,g:3,f:1},
  {col:4,row:0,g:4,f:2},{col:5,row:0,g:5,f:Infinity}
 ];
 nodes.forEach(n=>heap.push(n));
 assert.deepEqual(Array.from({length:nodes.length},()=>heap.pop()?.col),
  [3,1,2,4,0,5]);
 assert.equal(heap.pop(),undefined);
 assert.equal(heap.length,0);
});

test('A* heap order matches stable array-sort frontier under mixed updates',()=>{
 let seed=723049;
 const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const heap=new RouteOpenHeap(),oracle=[];
 let next=0;
 for(let step=0;step<20000;step++){
  if(oracle.length===0||rng()<.7){
   const f=Math.floor(rng()*30)/4,g=rng();
   const node={col:next++,row:step,g,f};
   oracle.push(node);
   heap.push(node);
  }else{
   oracle.sort((a,b)=>a.f-b.f);
   const expected=oracle.shift(),actual=heap.pop();
   assert.deepEqual(actual&&{col:actual.col,row:actual.row,g:actual.g,f:actual.f},expected);
  }
  assert.equal(heap.length,oracle.length);
 }
 oracle.sort((a,b)=>a.f-b.f);
 while(oracle.length){
  const e=oracle.shift(),a=heap.pop();
  assert.deepEqual(a&&{col:a.col,row:a.row,g:a.g,f:a.f},e);
 }
});
