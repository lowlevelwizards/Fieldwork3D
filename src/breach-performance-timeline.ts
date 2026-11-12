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
export type PerformanceTimelineSample=Readonly<{
 at:number;raf:number;js:number;sync:number;sim:number;recording:number;
 ui:number;overlay:number;scene:PerformanceSceneCosts;draws:number;
 steps:number;phase:string;camera:string;hotSim:string;
 fogPaints:number;shadowRefreshes:number;sight:PerformanceSightDelta;
}>;
export type PerformanceTimelineBucket={
 bucket:number;peak:PerformanceTimelineSample;
 maxSync:number;maxJs:number;frames:number
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
  overlay:finite(sample.overlay),draws:finite(sample.draws),
  steps:finite(sample.steps),fogPaints:finite(sample.fogPaints),
  shadowRefreshes:finite(sample.shadowRefreshes),sight:{...sample.sight}};
}
export function performanceHotspot(sample:PerformanceTimelineSample):string{
 let largest=sample.sim,owner='simulation';
 for(const key of PERFORMANCE_SCENE_PHASES){
  if(sample.scene[key]>largest){largest=sample.scene[key];owner=key;}
 }
 if(sample.ui>largest){largest=sample.ui;owner='UI / runtime';}
 const missed=Math.max(0,sample.raf-sample.js);
 if(missed>Math.max(22,largest*1.4))
  return 'unattributed frame gap (GPU/browser scheduling possible)';
 return owner+' (largest measured CPU slice)';
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
  if(current&&current.bucket===bucket){
   current.frames++;
   if(sample.raf>current.peak.raf)current.peak=copy(sample);
   current.maxSync=Math.max(current.maxSync,sample.sync);
   current.maxJs=Math.max(current.maxJs,sample.js);
  }else{
   this.series.push({bucket,peak:copy(sample),frames:1,
    maxSync:finite(sample.sync),maxJs:finite(sample.js)});
  }
  while(this.series.length>PERFORMANCE_BUCKET_COUNT||
   (this.series.length&&bucket-this.series[0].bucket>=PERFORMANCE_BUCKET_COUNT))
    this.series.shift();
 }
 get count():number{return this.series.length;}
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
   'sight_hits,sight_misses,phase,camera'];
  for(const {bucket,peak:p,maxSync} of this.series){
   const fields=[bucket*PERFORMANCE_BUCKET_MS/1000,
    p.raf,p.js,p.sync,maxSync,p.sim,p.scene.actors,p.scene.disclosure,
    p.scene.effects,p.scene.fog,p.scene.gpuSubmit,p.steps,p.draws,
    p.fogPaints,p.shadowRefreshes,p.sight.hits,p.sight.misses,
    p.phase,p.camera];
   lines.push(fields.join(','));
  }
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
   'Spikes record the worst RAF gap in each 250ms bucket.',
   'Correlated work is not proof of the cause of a hitch.'
  ];
  const spikes=this.recentSpikes(10);
  if(!spikes.length)lines.push('No RAF gaps >=33.3ms in the recorded window.');
  for(const {peak:p} of spikes){
   const component=PERFORMANCE_SCENE_PHASES.map(key=>
    key+' '+p.scene[key].toFixed(1)).join(', ');
   lines.push(
    '- '+((latest-p.at)/1000).toFixed(1)+'s ago: '+
    'RAF '+p.raf.toFixed(1)+'ms, JS '+p.js.toFixed(1)+'ms, '+
    'SYNC '+p.sync.toFixed(1)+'ms, SIM '+p.sim.toFixed(1)+'ms, '+
    'UI '+p.ui.toFixed(1)+'ms, '+p.steps+' ticks, '+p.draws+
    ' draws; '+p.phase+'/'+p.camera+'; '+performanceHotspot(p)+
    '; fog +'+p.fogPaints+', shadow +'+p.shadowRefreshes+
    '; P1 H/M/INV '+p.sight.hits+'/'+p.sight.misses+'/'+p.sight.invalidations+
    '; hot simulation: '+(p.hotSim||'none')+'; scene phases: '+component
   );
  }
  return lines.join('\n');
 }
}
