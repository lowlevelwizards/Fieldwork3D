/** E5.4 — controlled release invariants for sustained replay archive cycles.
 * Memory/heap and GC timing are observational. Evidence and ownership are
 * gated: a fresh read must supersede a previously restored archive.
 */
import {verifyReplayLifecycleMemory,summarizeReplayMemory}
 from './refactor-e5-browser-memory-contract.mjs';

export function verifySustainedReplayMemory(rows,{
 minFrames=800,minEvents=400,maxDomGrowth=200,maxListenerGrowth=150
}={}){
 if(rows.length<4)throw Error('E5.4 requires four post-warmup archive cycles');
 const versions=new Set(),observed=new Set();
 for(const row of rows){
  if(row.frames<minFrames||row.events<minEvents)
   throw Error('E5.4 archive workload was not long and event-dense');
  if(row.expectedVersion!==row.observedVersion||
     !['A','B'].includes(row.expectedVersion))
   throw Error('E5.4 replay displayed a stale or incorrect saved archive');
  if(row.libraryCount!==1)
   throw Error('E5.4 archive replacement created unexpected library entries');
  if(row.liveClock!=='00:00')
   throw Error('E5.4 archive replacement altered authoritative live clock');
  versions.add(row.expectedVersion);observed.add(row.observedVersion);
 }
 if(versions.size!==2||observed.size!==2)
  throw Error('E5.4 must test two different saved revisions');
 const exit=rows.map(r=>r.postExit);
 const lifecycle=verifyReplayLifecycleMemory(exit,{
  maxDomGrowth,maxListenerGrowth
 });
 return {
  cycles:rows.length,versions:[...versions].sort(),
  lifecycle,postExitHeap:summarizeReplayMemory(exit).heap,
  allVersionsCorrect:true,
  browserHeapCaveat:'V8 post-GC heap is not a leak proof, FPS or GC-pause measurement'
 };
}
