/** P1.5c: Opt-in bounded time-series performance sampler.
 * Stores the worst RAF frame in each 250ms bucket for 60s. It never assigns
 * causation from correlated events, and never estimates GPU execution time.
 * Only instantiate under ?perf=1.
 */
export type PerformanceScenePhase='environment'|'camera'|'disclosure'|
 'actors'|'effects'|'fog'|'shadows'|'postCamera'|'gpuSubmit';
export const PERFORMANCE_SCENE_PHASES:readonly PerformanceScenePhase[]=[
 'environment','camera','disclosure','actors','effects','fog',
 'shadows','postCamera','gpuSubmit'
] as const;
export type PerformanceSceneCosts=Readonly<Record<PerformanceScenePhase,number>>;
export type PerformanceSightDelta=Readonly<{
 queries:number;hits:number;misses:number;bypasses:number;invalidations:number
}>;
/** A RAF gap ends at this callback. Its preceding JS work belongs to the
 * previous callback, not the JS measured *after* this gap. */
export type PerformanceTimelineSample=Readonly<{
 at:number;raf:number;js:number;sync:number;sim:number;recording:number;
 previousJs?:number;previousSim?:number;previousPhase?:string;
 ui:number;overlay:number;scene:PerformanceSceneCosts;draws:number;
 steps:number;phase:string;camera:string;hotSim:string;
 fogPaints:number;shadowRefreshes:number;sight:PerformanceSightDelta;
}>;
export type PerformancePhase='live'|'idle'|'replay'|'other';
export type PerformancePhaseCounts={
 frames:number;slow:number;severe:number;worst:number
};
const newPhaseCounts=():PerformancePhaseCounts=>({
 frames:0,slow:0,severe:0,worst:0
});
const newModeCounts=():Record<PerformancePhase,PerformancePhaseCounts>=>({
 live:newPhaseCounts(),idle:newPhaseCounts(),
 replay:newPhaseCounts(),other:newPhaseCounts()
});
const historyPhase=(phase:string):PerformancePhase=>
 phase==='live'||phase==='idle'||phase==='replay'?phase:'other';
export type PerformanceTimelineBucket={
 bucket:number;peak:PerformanceTimelineSample;
 maxSync:number;maxJs:number;frames:number;
 modes:Record<PerformancePhase,PerformancePhaseCounts>;
};
const EMPTY_SCENE:PerformanceSceneCosts=Object.freeze({
 environment:0,camera:0,disclosure:0,actors:0,effects:0,
 fog:0,shadows:0,postCamera:0,gpuSubmit:0
});
export const emptyPerformanceSceneCosts=()=>EMPTY_SCENE;
export const zeroSightDelta=():PerformanceSightDelta=>({
 queries:0,hits:0,misses:0,bypasses:0,invalidations:0
});
export const PERFORMANCE_HISTORY_MS=60000;
export const PERFORMANCE_BUCKET_MS=250;
export const PERFORMANCE_BUCKET_COUNT=
 PERFORMANCE_HISTORY_MS/PERFORMANCE_BUCKET_MS;
const finite=(n:number)=>Number.isFinite(n)?Math.max(0,n):0;
/** An explicit copy avoids changing an archived spike when stage counters
 * are reset and reused for the next frame.
 */
function copy(sample:PerformanceTimelineSample):PerformanceTimelineSample{
 const scene={} as Record<PerformanceScenePhase,number>;
 for(const k of PERFORMANCE_SCENE_PHASES)scene[k]=finite(sample.scene[k]);
 return {...sample,scene,at:sample.at,raf:finite(sample.raf),
  js:finite(sample.js),sync:finite(sample.sync),sim:finite(sample.sim),
  recording:finite(sample.recording),ui:finite(sample.ui),
  previousJs:sample.previousJs===undefined?undefined:finite(sample.previousJs),
  previousSim:sample.previousSim===undefined?undefined:finite(sample.previousSim),
  overlay:finite(sample.overlay),draws:finite(sample.draws),
  steps:finite(sample.steps),fogPaints:finite(sample.fogPaints),
  shadowRefreshes:finite(sample.shadowRefreshes),sight:{...sample.sight}};
}
/** Diagnose the interval ending at this callback without blaming work
 * performed afterward. Remaining time is unmeasured browser/other-task
 * scheduling, NOT a GPU execution timer. */
export function performanceHotspot(sample:PerformanceTimelineSample):string{
 if(sample.previousJs!==undefined){
  if(sample.previousJs>=Math.max(33.3,sample.raf*.65))
   return 'prior-frame JS occupied RAF interval';
  if(sample.raf-sample.previousJs>=Math.max(33.3,sample.raf*.5))
   return 'between-callback wait (cause unconfirmed)';
  return 'mixed prior-frame CPU and callback wait';
 }
 const missed=Math.max(0,sample.raf-sample.js);
 if(missed>22)return 'unattributed frame gap (prior CPU unknown)';
 return 'preceding-frame cost unavailable';
}
export class PerformanceTimeline{
 private readonly series:PerformanceTimelineBucket[]=[];
 add(sample:PerformanceTimelineSample):void{
  const at=Math.max(0,sample.at),bucket=Math.floor(at/PERFORMANCE_BUCKET_MS);
  const last=this.series[this.series.length-1];
  if(last&&bucket<last.bucket){ // clock reset or a new mission timeline
   this.series.length=0;
  }
  const current=this.series[this.series.length-1];
  let item:PerformanceTimelineBucket;
  if(current&&current.bucket===bucket){
   item=current;item.frames++;
   if(sample.raf>item.peak.raf)item.peak=copy(sample);
   item.maxSync=Math.max(item.maxSync,sample.sync);
   item.maxJs=Math.max(item.maxJs,sample.js);
  }else{
   item={bucket,peak:copy(sample),frames:1,
    maxSync:finite(sample.sync),maxJs:finite(sample.js),
    modes:newModeCounts()};
   this.series.push(item);
  }
  const mode=item.modes[historyPhase(sample.phase)];
  mode.frames++;
  if(sample.raf>=33.3)mode.slow++;
  if(sample.raf>=66.7)mode.severe++;
  mode.worst=Math.max(mode.worst,sample.raf);
  while(this.series.length>PERFORMANCE_BUCKET_COUNT||
   (this.series.length&&bucket-this.series[0].bucket>=PERFORMANCE_BUCKET_COUNT))
    this.series.shift();
 }
 get count():number{return this.series.length;}
 /** Per-callback counts distinguish running from paused frames.
  * Unlike the graph's peaks, these count every observed RAF callback.
  * Fixed counters are updated only under opt-in ?perf=1. */
 phaseSummary():Record<PerformancePhase,PerformancePhaseCounts>{
  const totals=newModeCounts();
  for(const bucket of this.series){
   for(const mode of ['live','idle','replay','other'] as const){
    const out=totals[mode],inMode=bucket.modes[mode];
    out.frames+=inMode.frames;
    out.slow+=inMode.slow;out.severe+=inMode.severe;
    out.worst=Math.max(out.worst,inMode.worst);
   }
  }
  return totals;
 }
 /** Only the timeline's own immutable snapshots escape the ring. */
 buckets():readonly PerformanceTimelineBucket[]{return this.series;}
 recentSpikes(limit=6):PerformanceTimelineBucket[]{
  return this.series.filter(b=>b.peak.raf>=33.3)
   .slice().sort((a,b)=>b.peak.raf-a.peak.raf).slice(0,limit);
 }
 maxRaf():number{
  let peak=0;
  for(const item of this.series)peak=Math.max(peak,item.peak.raf);
  return peak;
 }
 reset():void{this.series.length=0;}
 /** Export every retained 250ms peak, not just the top ten spikes.
  * Safe for copying from iOS; no remote telemetry or persistent storage.
  */
 bucketCSV():string{
  const lines=['t_sec,raf_peak_ms,js_at_peak_ms,sync_at_peak_ms,'+
   'sync_peak_ms,sim_ms,actors_ms,disclosure_ms,effects_ms,fog_ms,'+
   'gpu_submit_cpu_ms,steps,draws,fog_paints,shadow_refreshes,'+
   'sight_hits,sight_misses,phase,camera,'+
   'previous_js_ms,previous_sim_ms,previous_phase,callback_wait_ms'];
  for(const {bucket,peak:p,maxSync} of this.series){
   const fields=[bucket*PERFORMANCE_BUCKET_MS/1000,
    p.raf,p.js,p.sync,maxSync,p.sim,p.scene.actors,p.scene.disclosure,
    p.scene.effects,p.scene.fog,p.scene.gpuSubmit,p.steps,p.draws,
    p.fogPaints,p.shadowRefreshes,p.sight.hits,p.sight.misses,
    p.phase,p.camera,p.previousJs??'',p.previousSim??'',
    p.previousPhase??'',p.previousJs===undefined?'':
     Math.max(0,p.raf-p.previousJs)];
   lines.push(fields.join(','));
  }
  return lines.join('\n');
 }
 /** Short enough to paste into a phone chat. The full history is exported
  * separately as a text file so we do not discard diagnostic detail.
  * Peak counts are 250ms buckets, NOT a number of individual frames.
  */
 compactReport(policy:string,view:string):string{
  const all=this.series,latest=all[all.length-1]?.peak.at??0;
  let critical=0,slow=0;
  for(const b of all){
   if(b.peak.raf>=66.7)critical++;
   else if(b.peak.raf>=33.3)slow++;
  }
  const lines=[
   'FIELDWORK PERF · last 60s | '+policy+' / '+view,
   'RAF worst '+this.maxRaf().toFixed(0)+'ms | spike buckets: '+
    critical+' >=67ms, '+slow+' 33–66ms'
  ];
  const modes=this.phaseSummary();
  for(const name of ['live','idle','replay'] as const){
   const m=modes[name];
   if(m.frames)lines.push(name.toUpperCase()+' '+m.frames+'f / >=33 '+
    m.slow+' / >=67 '+m.severe+' / max '+m.worst.toFixed(0)+'ms');
  }
  lines.push('Top RAF spikes (time ago; ms):');
  const peaks=this.recentSpikes(5);
  if(!peaks.length)lines.push('None >=33ms');
  for(const {peak:p} of peaks){
   const cause=performanceHotspot(p);
   lines.push(
    '-'+((latest-p.at)/1000).toFixed(1)+'s RAF '+p.raf.toFixed(0)+
    ' | prevJS '+(p.previousJs?.toFixed(0)??'?')+
    '/sim'+(p.previousSim?.toFixed(0)??'?')+
    ' nowJS '+p.js.toFixed(0)+'/sim'+p.sim.toFixed(0)+
    ' | wait '+(p.previousJs===undefined?'?':
      Math.max(0,p.raf-p.previousJs).toFixed(0))+
    ' | '+p.phase+'/'+p.camera+' | '+cause
   );
  }
  lines.push('wait = RAF - previous JS; not GPU time. Full history: TXT.');
  return lines.join('\n');
 }
 report(policy:string,view:string):string{
  const latest=this.series[this.series.length-1]?.peak.at??0;
  const all=this.series;
  const lines=[
   'FIELDWORK P1.5 — PERFORMANCE HISTORY (last 60 seconds)',
   'Policy: '+policy+' | View: '+view+
    ' | buckets: '+all.length+' | worst RAF: '+this.maxRaf().toFixed(1)+'ms',
   'RAF = interval between callbacks; CPU timing != GPU execution time.',
   'PREVIOUS JS can occupy that interval; current JS happens afterward.',
   'Remaining callback wait includes compositor, scheduling and other tasks.',
   'Spikes record the worst RAF gap in each 250ms bucket.',
   'Correlated work is not proof of the cause of a hitch.'
  ];
  const modeTotals=this.phaseSummary();
  for(const mode of ['live','idle','replay'] as const){
   const stat=modeTotals[mode];
   if(stat.frames)lines.push(mode.toUpperCase()+' CALLBACKS '+stat.frames+
    ' | >=33ms '+stat.slow+' | >=67ms '+stat.severe+
    ' | worst '+stat.worst.toFixed(1)+'ms');
  }
  const spikes=this.recentSpikes(10);
  if(!spikes.length)lines.push('No RAF gaps >=33.3ms in the recorded window.');
  for(const {peak:p} of spikes){
   const component=PERFORMANCE_SCENE_PHASES.map(key=>
    key+' '+p.scene[key].toFixed(1)).join(', ');
   lines.push(
    '- '+((latest-p.at)/1000).toFixed(1)+'s ago: '+
    'RAF '+p.raf.toFixed(1)+'ms, PREVIOUS JS '+
    (p.previousJs?.toFixed(1)??'unknown')+'ms, PREVIOUS SIM '+
    (p.previousSim?.toFixed(1)??'unknown')+'ms ('+
    (p.previousPhase??'unknown')+'), CURRENT JS '+p.js.toFixed(1)+
    'ms, CURRENT SYNC '+p.sync.toFixed(1)+'ms, CURRENT SIM '+
    p.sim.toFixed(1)+'ms, UI '+p.ui.toFixed(1)+'ms, '+
    p.steps+' ticks, '+p.draws+
    ' draws; '+p.phase+'/'+p.camera+'; '+performanceHotspot(p)+
    '; fog +'+p.fogPaints+', shadow +'+p.shadowRefreshes+
    '; P1 H/M/INV '+p.sight.hits+'/'+p.sight.misses+'/'+p.sight.invalidations+
    '; hot simulation: '+(p.hotSim||'none')+'; scene phases: '+component
   );
  }
  return lines.join('\n');
 }
}
