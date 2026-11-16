/** E5.3: phase-aligned Chromium memory snapshots (NOT physical iOS).
 * Stable lifecycle checks are release-gated; absolute JS heap/GC timings
 * remain observational because V8 JIT/GC and software WebGL vary by host.
 */
export function summarizeReplayMemory(rows){
 const numbers=key=>rows.map(row=>row[key]).filter(Number.isFinite);
 const dom=numbers('nodes'),detached=numbers('detachedNodes'),heap=numbers('usedHeapBytes');
 const series=arr=>({
  first:arr[0]??null,last:arr.at(-1)??null,
  min:arr.length?Math.min(...arr):null,
  max:arr.length?Math.max(...arr):null,
  delta:arr.length?arr.at(-1)-arr[0]:null
 });
 return {cycles:rows.length,dom:series(dom),detached:series(detached),
  heap:series(heap),
  peakFeedButtons:rows.length?Math.max(...rows.map(x=>x.feedButtons)):0,
  allClosed:rows.every(x=>x.replayClosed===true),
  allFeedClean:rows.every(x=>x.feedButtons===0)};
}
export function verifyReplayLifecycleMemory(rows,{
 maxDomGrowth=140,maxDetachedGrowth=220
}={}){
 if(rows.length<4)throw Error('E5.3 needs four measured post-warmup exits');
 const report=summarizeReplayMemory(rows);
 if(!report.allClosed)throw Error('Replay panel remained visible after exit');
 if(!report.allFeedClean)throw Error('Replay event DOM was retained after exit');
 if(report.dom.delta>maxDomGrowth)
  throw Error('Chromium post-GC DOM grew across exits: '+report.dom.delta);
 if(report.detached.delta>maxDetachedGrowth)
  throw Error('Chromium post-GC detached DOM grew across exits: '+
    report.detached.delta);
 return report;
}
