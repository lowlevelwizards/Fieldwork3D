import test from 'node:test';
import assert from 'node:assert/strict';
import {runE5MemoryStudy}
 from '../scripts/verification/refactor-e5-replay-memory.mjs';
import {verifySustainedReplayMemory}
 from '../scripts/verification/refactor-e5-sustained-contract.mjs';

function observed(){
 return Array.from({length:4},(_,i)=>({
  cycle:i,frames:1201,events:800,libraryCount:1,
  expectedVersion:i%2===0?'A':'B',
  observedVersion:i%2===0?'A':'B',liveClock:'00:00',
  postExit:{cycle:i,nodes:2900+i*4,listeners:440+i,
   usedHeapBytes:55e6+i*8e6,replayClosed:true,feedButtons:0}
 }));
}
test('E5.4 extended 481-frame replay shares unchanged effects with exact film parity',()=>{
 const result=runE5MemoryStudy({frames:481});
 assert.equal(result.baseline.digest,result.optimized.digest);
 assert.equal(result.baseline.retainedEffectArrayReferences,
  result.optimized.retainedEffectArrayReferences);
 assert.ok(result.optimized.avoidedArrays>2000);
 assert.ok(result.optimized.avoidedValueObjects>15000);
});
test('E5.4 long archive alternates same-key saved revisions without stale display',()=>{
 const report=verifySustainedReplayMemory(observed());
 assert.deepEqual(report.versions,['A','B']);
 assert.equal(report.lifecycle.allClosed,true);
 assert.equal(report.lifecycle.allFeedClean,true);
 assert.equal(report.allVersionsCorrect,true);
});
test('E5.4 rejects stale displayed revision and missing variant',()=>{
 const stale=observed();stale[2].observedVersion='B';
 assert.throws(()=>verifySustainedReplayMemory(stale),/stale or incorrect/);
 const one=observed().map(x=>({...x,expectedVersion:'A',observedVersion:'A'}));
 assert.throws(()=>verifySustainedReplayMemory(one),/two different/);
});
test('E5.4 rejects missing evidence and mutated live mission after replacement',()=>{
 const incomplete=observed();incomplete[2].events=15;
 assert.throws(()=>verifySustainedReplayMemory(incomplete),/not long and event-dense/);
 const changed=observed();changed[1].liveClock='00:19';
 assert.throws(()=>verifySustainedReplayMemory(changed),/authoritative live clock/);
});
test('E5.4 detects retained buttons and accumulating live DOM/listeners',()=>{
 const feed=observed();feed[1].postExit.feedButtons=80;
 assert.throws(()=>verifySustainedReplayMemory(feed),/event DOM/);
 const nodes=observed();nodes[3].postExit.nodes+=300;
 assert.throws(()=>verifySustainedReplayMemory(nodes),/post-GC DOM grew/);
 const listeners=observed();listeners[3].postExit.listeners+=200;
 assert.throws(()=>verifySustainedReplayMemory(listeners),/event listeners grew/);
});
test('E5.4 post-GC JS heap trend stays observational',()=>{
 const rows=observed();
 rows[3].postExit.usedHeapBytes+=120e6;
 const report=verifySustainedReplayMemory(rows);
 assert.ok(report.postExitHeap.delta>120e6);
 assert.match(report.browserHeapCaveat,/not a leak proof/);
});
