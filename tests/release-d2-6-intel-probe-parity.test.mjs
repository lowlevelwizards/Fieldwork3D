/** D2.6: prove zero change to structural sight probe order and answers. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {observeIntel} from '../src/breach-intel.ts';
const intel=()=>({mode:'true-blind',walls:new Set(),doors:new Set(),
 cover:new Set(),rooms:new Set(),doorMemory:new Map()});
test('D2.6.4c cover outline preserves eight historical probes and short circuit',()=>{
 const o={x:120,y:90,w:28,h:22},x=o.w/2+2.5,y=o.h/2+2.5;
 const expected=[
  {x:o.x-x,y:o.y},{x:o.x+x,y:o.y},
  {x:o.x,y:o.y-y},{x:o.x,y:o.y+y},
  {x:o.x-x,y:o.y-y},{x:o.x+x,y:o.y-y},
  {x:o.x-x,y:o.y+y},{x:o.x+x,y:o.y+y}
 ];
 for(let first=-1;first<8;first++){
  const state=intel(),probes=[];
  observeIntel(state,undefined,[],p=>{
   probes.push(p);
   return probes.length-1===first;
  },{walls:[],cover:[o]});
  assert.deepEqual(probes,first<0?expected:expected.slice(0,first+1),
   'original physical sample order and early return '+first);
  assert.equal(state.cover.has(0),first>=0);
  if(first>=0){
   let calls=0;
   observeIntel(state,undefined,[],()=>{calls++;return true;},
    {walls:[],cover:[o]});
   assert.equal(calls,0,'discovered fixture never needs more view rays');
  }
 }
});
test('D2.6.4c wall normal is reused without changing 3x3 real sight samples',()=>{
 const w={a:{x:21,y:13},b:{x:76,y:99}},dx=w.b.x-w.a.x,
  dy=w.b.y-w.a.y,n=Math.max(1,Math.hypot(dx,dy));
 const expected=[];
 for(const t of [.25,.5,.75]){
  const p={x:w.a.x+dx*t,y:w.a.y+dy*t};
  const nx=-dy/n*12,ny=dx/n*12;
  expected.push(p,{x:p.x+nx,y:p.y+ny},{x:p.x-nx,y:p.y-ny});
 }
 const captured=[],state=intel();
 observeIntel(state,undefined,[],p=>{captured.push(p);return false;},
  {walls:[w],cover:[]});
 assert.deepEqual(captured,expected);
 assert.equal(state.walls.size,0);
 // Early success at every one of nine points must stop identically.
 for(let stop=0;stop<9;stop++){
  const memory=intel(),trace=[];
  observeIntel(memory,undefined,[],p=>{
   trace.push(p);return trace.length-1===stop;
  },{walls:[w],cover:[]});
  assert.deepEqual(trace,expected.slice(0,stop+1));
  assert.equal(memory.walls.has(0),true);
 }
});
