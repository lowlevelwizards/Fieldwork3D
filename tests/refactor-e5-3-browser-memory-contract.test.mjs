import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeReplayMemory,verifyReplayLifecycleMemory}
 from '../scripts/verification/refactor-e5-browser-memory-contract.mjs';

const cycles=(dom=[1500,1510,1504,1512],listeners=[320,323,320,325])=>
 dom.map((nodes,i)=>({cycle:i,nodes,listeners:listeners[i],
  usedHeapBytes:25e6+i*9000,replayClosed:true,feedButtons:0}));
test('E5.3 Chromium observations separate stable DOM lifecycle from heap sampling',()=>{
 const rows=cycles();
 const result=verifyReplayLifecycleMemory(rows);
 assert.equal(result.allClosed,true);
 assert.equal(result.allFeedClean,true);
 assert.equal(result.cycles,4);
 assert.equal(result.dom.delta,12);
 assert.equal(result.listeners.delta,5);
 assert.equal(result.heap.delta,27000);
});
test('E5.3 a retained replay feed or visible replay panel fails the release gate',()=>{
 const first=cycles();first[3].feedButtons=80;
 assert.throws(()=>verifyReplayLifecycleMemory(first),/event DOM/);
 const second=cycles();second[1].replayClosed=false;
 assert.throws(()=>verifyReplayLifecycleMemory(second),/remained visible/);
});
test('E5.3 monotonic listener and live DOM accumulation is detected',()=>{
 assert.throws(()=>verifyReplayLifecycleMemory(
  cycles([1500,1590,1680,1780])),/post-GC DOM grew/);
 assert.throws(()=>verifyReplayLifecycleMemory(
  cycles([1500,1510,1510,1510],[320,400,460,520])),
  /event listeners grew/);
});
test('E5.3 heap remains observational; reject too few post-warmup samples',()=>{
 assert.throws(()=>verifyReplayLifecycleMemory(cycles().slice(0,3)),
  /four measured/);
 const data=cycles();
 data[3].usedHeapBytes+=75e6;
 assert.equal(verifyReplayLifecycleMemory(data).heap.delta>50e6,true);
});
