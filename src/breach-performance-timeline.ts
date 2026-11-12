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
/** CPU slices measured during the *preceding* RAF callback. Stage scene
 * phases are CPU durations and do not measure GPU execution. */
export type PreviousFrameWork=Readonly<{
 beforeUi:number;ui:number;sceneSync:number;render:number;
 postRender:number;diagnostics:number;scene:PerformanceSceneCosts;
 uiDetail?:Readonly<{camera:number;audio:number;hud:number;rings:number}>;
 actor?:Readonly<{rigMs:number;rigBuilds:number;poseMs:number;poseCount:number;
  appearanceMs?:number;weaponBuildMs?:number;otherPoseMs?:number;
  visualKitMs?:number;receiverAtlasMs?:number}>
}>;
export type PerformanceTimelineSample=Readonly<{
 /** Only RAF/JS, collected before the player enables detailed profiling. */
 captureLevel?:'basic';
 at:number;raf:number;js:number;sync:number;sim:number;recording:number;
 previousJs?:number;previousSim?:number;previousPhase?:string;
 previousHotSim?:string;
 previousWork?:PreviousFrameWork;
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
  previousWork:sample.previousWork?{
   ...sample.previousWork,
   beforeUi:finite(sample.previousWork.beforeUi),
   ui:finite(sample.previousWork.ui),
   uiDetail:sample.previousWork.uiDetail?{
    camera:finite(sample.previousWork.uiDetail.camera),
    audio:finite(sample.previousWork.uiDetail.audio),
    hud:finite(sample.previousWork.uiDetail.hud),
    rings:finite(sample.previousWork.uiDetail.rings)
   }:undefined,
   sceneSync:finite(sample.previousWork.sceneSync),
   render:finite(sample.previousWork.render),
   postRender:finite(sample.previousWork.postRender),
   diagnostics:finite(sample.previousWork.diagnostics),
   actor:sample.previousWork.actor?{...sample.previousWork.actor}:undefined,
   scene:Object.fromEntries(PERFORMANCE_SCENE_PHASES.map(k=>
    [k,finite(sample.previousWork!.scene[k])])) as PerformanceSceneCosts
  }:undefined,
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
/** Largest measured preceding callback slice, for diagnostic prioritization.
 * This reports CPU wall time, without inferring why the work was slow. */
export function previousFrameHotspot(sample:PerformanceTimelineSample):string{
 const work=sample.previousWork;
 if(!work)return 'prior slices unavailable';
 const items:[string,number][]=[
  ['before UI',work.beforeUi],['UI / audio',work.ui],
  ['3D scene',work.sceneSync],['canvas render',work.render],
  ['post-render',work.postRender],['profiler',work.diagnostics]
 ];
 let winner=items[0];
 for(const item of items)if(item[1]>winner[1])winner=item;
 if(winner[0]==='UI / audio'&&work.uiDetail){
  const d=work.uiDetail;
  const children:[string,number][]=[
   ['camera',d.camera],['audio',d.audio],
   ['HUD',d.hud],['action rings',d.rings]
  ];
  let hottest=children[0];
  for(const child of children)if(child[1]>hottest[1])hottest=child;
  return 'UI '+hottest[0]+' '+hottest[1].toFixed(0)+
   'ms / total '+work.ui.toFixed(0)+'ms';
 }
 if(winner[0]==='3D scene'){
  let inner:PerformanceScenePhase='environment';
  for(const name of PERFORMANCE_SCENE_PHASES)
   if(work.scene[name]>work.scene[inner])inner=name;
  if(inner==='actors'&&work.actor){
   const a=work.actor;
   return '3D actors '+work.scene.actors.toFixed(0)+'ms'+
    ' (rig '+a.rigMs.toFixed(0)+'ms/'+a.rigBuilds+
    ', pose '+a.poseMs.toFixed(0)+'ms/'+a.poseCount+
    (a.appearanceMs!==undefined?
     ', app '+a.appearanceMs.toFixed(0)+
     ' / gun '+(a.weaponBuildMs??0).toFixed(0)+
     ' / IK+'+(a.otherPoseMs??0).toFixed(0)+
     (a.visualKitMs!==undefined?
      ' · kit '+a.visualKitMs.toFixed(0)+
      ' / atlas '+(a.receiverAtlasMs??0).toFixed(0):''):'')+')';
  }
  return '3D '+inner+' '+work.scene[inner].toFixed(0)+
   'ms / sync '+work.sceneSync.toFixed(0)+'ms';
 }
 return winner[0]+' '+winner[1].toFixed(0)+'ms';
}
export class PerformanceTimeline{
 private readonly series:PerformanceTimelineBucket[]=[];
 /** Always-on, minimal RAF history before the player opens diagnostics.
  * Keeps the SAME bounded 250ms buckets and exact per-mode callback counts,
  * but does not create a detailed sample/copy for every RAF. Scene and
  * simulation attribution prior to arming the profiler is unavailable.
  * This has no gameplay, GPU, DOM, or simulation instrumentation cost. */
 addCoarseFrame(at:number,raf:number,js:number,phase:string,camera:string,
   previousJs?:number,previousPhase?:string):void{
  const stamp=Math.max(0,at),bucket=Math.floor(stamp/PERFORMANCE_BUCKET_MS);
  const previous=this.series[this.series.length-1];
  if(previous&&bucket<previous.bucket)this.series.length=0;
  const current=this.series[this.series.length-1];
  const makePeak=():PerformanceTimelineSample=>({
   captureLevel:'basic',at:stamp,raf:finite(raf),js:finite(js),sync:0,sim:0,recording:0,
   previousJs,previousPhase,ui:0,overlay:0,scene:EMPTY_SCENE,
   draws:0,steps:0,phase,camera,hotSim:'',
   fogPaints:0,shadowRefreshes:0,sight:{
    queries:0,hits:0,misses:0,bypasses:0,invalidations:0
   }
  });
  let item:PerformanceTimelineBucket;
  if(current&&current.bucket===bucket){
   item=current;item.frames++;
   if(raf>item.peak.raf)item.peak=makePeak();
   item.maxJs=Math.max(item.maxJs,finite(js));
  }else{
   item={bucket,peak:makePeak(),frames:1,maxSync:0,
    maxJs:finite(js),modes:newModeCounts()};
   this.series.push(item);
  }
  const m=item.modes[historyPhase(previousPhase??phase)];
  m.frames++;
  if(raf>=33.3)m.slow++;
  if(raf>=66.7)m.severe++;
  m.worst=Math.max(m.worst,raf);
  while(this.series.length>PERFORMANCE_BUCKET_COUNT||
    (this.series.length&&bucket-this.series[0].bucket>=PERFORMANCE_BUCKET_COUNT))
   this.series.shift();
 }
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
  // RAF gap belongs to the callback that started the interval. A mode
  // transition must not blame live simulation for a prior idle hitch.
  const mode=item.modes[historyPhase(sample.previousPhase??sample.phase)];
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
   'sight_hits,sight_misses,phase,camera,capture_level,'+
   'previous_js_ms,previous_sim_ms,previous_phase,callback_wait_ms,'+
   'prior_before_ui_ms,prior_ui_ms,prior_scene_sync_ms,'+
   'prior_ui_camera_ms,prior_ui_audio_ms,prior_ui_hud_ms,prior_ui_rings_ms,'+
   'prior_canvas_ms,prior_post_ms,prior_profiler_ms,'+
   'prior_scene_actors_ms,prior_scene_fog_ms,prior_scene_submit_cpu_ms,'+
   'prior_rig_build_ms,prior_rig_build_count,'+
   'prior_pose_ms,prior_pose_count,prior_hot_sim_phase,'+
   'prior_pose_appearance_ms,prior_pose_weapon_build_ms,prior_pose_other_ms,'+
   'prior_visual_kit_ms,prior_receiver_atlas_ms'];
  for(const {bucket,peak:p,maxSync} of this.series){
   const fields=[bucket*PERFORMANCE_BUCKET_MS/1000,
    p.raf,p.js,p.sync,maxSync,p.sim,p.scene.actors,p.scene.disclosure,
    p.scene.effects,p.scene.fog,p.scene.gpuSubmit,p.steps,p.draws,
    p.fogPaints,p.shadowRefreshes,p.sight.hits,p.sight.misses,
    p.phase,p.camera,p.captureLevel??'detailed',p.previousJs??'',p.previousSim??'',
    p.previousPhase??'',p.previousJs===undefined?'':
     Math.max(0,p.raf-p.previousJs),
    p.previousWork?.beforeUi??'',p.previousWork?.ui??'',
    p.previousWork?.sceneSync??'',
    p.previousWork?.uiDetail?.camera??'',p.previousWork?.uiDetail?.audio??'',
    p.previousWork?.uiDetail?.hud??'',p.previousWork?.uiDetail?.rings??'',
    p.previousWork?.render??'',
    p.previousWork?.postRender??'',p.previousWork?.diagnostics??'',
    p.previousWork?.scene.actors??'',p.previousWork?.scene.fog??'',
    p.previousWork?.scene.gpuSubmit??'',
    p.previousWork?.actor?.rigMs??'',
    p.previousWork?.actor?.rigBuilds??'',
    p.previousWork?.actor?.poseMs??'',
    p.previousWork?.actor?.poseCount??'',
    p.previousHotSim??'',
    p.previousWork?.actor?.appearanceMs??'',
    p.previousWork?.actor?.weaponBuildMs??'',
    p.previousWork?.actor?.otherPoseMs??'',
    p.previousWork?.actor?.visualKitMs??'',
    p.previousWork?.actor?.receiverAtlasMs??''];
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
    ' | '+(p.previousPhase??p.phase)+'/'+p.camera+
    (p.previousWork?' | '+previousFrameHotspot(p):'')+
    (p.previousSim!==undefined&&p.previousSim>=50&&p.previousHotSim?
     ' | SIM '+p.previousHotSim:'')+' | '+cause
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
   'BASIC samples before the PERF panel is activated contain RAF/JS only;', 
   'zero scene/CPU phase values in BASIC rows are NOT measured zeros.',
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
    ' draws; '+p.phase+'/'+p.camera+
    (p.captureLevel==='basic'?' [BASIC RAF/JS]':'')+
    '; prior hotspot '+
    previousFrameHotspot(p)+'; prior simulation phase '+
    (p.previousHotSim||'none')+'; '+performanceHotspot(p)+
    '; fog +'+p.fogPaints+', shadow +'+p.shadowRefreshes+
    '; P1 H/M/INV '+p.sight.hits+'/'+p.sight.misses+'/'+p.sight.invalidations+
    '; hot simulation: '+(p.hotSim||'none')+'; scene phases: '+component
   );
  }
  return lines.join('\n');
 }
}
