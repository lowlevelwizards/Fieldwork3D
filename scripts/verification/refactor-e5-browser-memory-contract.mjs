/** E5.3: phase-aligned Chromium memory snapshots (NOT physical iOS).
 * Stable lifecycle checks are release-gated; absolute JS heap/GC timings
 * remain observational because V8 JIT/GC and software WebGL vary by host.
 */
export function summarizeReplayMemory(rows){
 const numbers=key=>rows.map(row=>row[key]).filter(Number.isFinite);
 const dom=numbers('nodes'),listeners=numbers('listeners'),
  heap=numbers('usedHeapBytes');
 const series=arr=>({
  first:arr[0]??null,last:arr.at(-1)??null,
  min:arr.length?Math.min(...arr):null,
  max:arr.length?Math.max(...arr):null,
  delta:arr.length?arr.at(-1)-arr[0]:null
 });
 return {cycles:rows.length,dom:series(dom),listeners:series(listeners),
  heap:series(heap),
  peakPostExitFeedButtons:rows.length?Math.max(...rows.map(x=>x.feedButtons)):0,
  allClosed:rows.every(x=>x.replayClosed===true),
  allFeedClean:rows.every(x=>x.feedButtons===0)};
}
export function verifyReplayLifecycleMemory(rows,{
 maxDomGrowth=140,maxListenerGrowth=120
}={}){
 if(rows.length<4)throw Error('E5.3 needs four measured post-warmup exits');
 const report=summarizeReplayMemory(rows);
 if(!report.allClosed)throw Error('Replay panel remained visible after exit');
 if(!report.allFeedClean)throw Error('Replay event DOM was retained after exit');
 if(report.dom.delta>maxDomGrowth)
  throw Error('Chromium post-GC DOM grew across exits: '+report.dom.delta);
 if(report.listeners.delta!==null&&report.listeners.delta>maxListenerGrowth)
  throw Error('Chromium post-GC event listeners grew across exits: '+
    report.listeners.delta);
 return report;
}
