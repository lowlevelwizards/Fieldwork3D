/** E6.12: bounded, opt-in correlation of real tactical-loop callbacks
 * with the RAF interval ending at the NEXT callback.
 * Callbacks are wall times, not CPU utilization or GPU execution time.
 */
import {PERFORMANCE_SCENE_PHASES,type PerformanceSceneCosts,
 type PreviousFrameWork} from '../breach-performance-timeline.ts';
import type {LiveShadowSubmissionSample} from './breach-live-shadow-submit-profiler.ts';
import type {MainPassFrame} from './breach-live-main-pass-profiler.ts';
export type PostReadyRuntimeMode='live'|'idle'|'replay'|'suspended';
export type PostReadyRuntimeFrame=Readonly<{
 at:number;gapMs:number;callbackMs:number;
 simMs:number;recordingMs:number;uiMs:number;
 sceneMs:number;canvasMs:number;postMs:number;diagnosticsMs:number;
 mode:PostReadyRuntimeMode;viewMode:string;submitted3D:boolean;
 /** E6.15: phase snapshots collected ONLY from the real opt-in 3D frame. */
 sceneBreakdown?:PerformanceSceneCosts;
 actorBreakdown?:PreviousFrameWork['actor'];
 fogComposeMs?:number;
 /** Cumulative stage counters, differenced only within this capture. */
 shadowRefreshes?:number;fogTextureUploads?:number;
 gpuDrawCalls?:number;
 /** Actual current submitted frame, only with opt-in E6.16. */
 shadowSubmission?:LiveShadowSubmissionSample;
 mainPassSubmission?:MainPassFrame;
}>;
export type PostReadySpike=Readonly<{
 gapMs:number;precedingCallbackMs:number;
 outsidePrecedingCallbackMs:number;
 precedingMode:PostReadyRuntimeMode;currentMode:PostReadyRuntimeMode;
 precedingSceneMs:number;precedingSimMs:number;precedingUiMs:number;
 precedingCanvasMs:number;precedingPostMs:number;
 precedingSubmitted3D:boolean;kind:'prior-callback'|'between-callbacks'|'mixed';
 precedingDominantScenePhase?:keyof PerformanceSceneCosts;
 precedingDominantScenePhaseMs?:number;
 precedingShadowRenderWallMs?:number;
 precedingNonShadowWallMs?:number;
}>;
export type PostReadyModeCounts=Readonly<{
 frames:number;over50ms:number;over100ms:number;submitted3D:number;
}>;
export type LiveShadowSubmissionAttribution=Readonly<{
 frames:number;shadowRenderP95Ms:number|null;shadowRenderWorstMs:number|null;
 nonShadowP95Ms:number|null;nonShadowWorstMs:number|null;
 shadowDrawCallsP95:number|null;nonShadowDrawCallsP95:number|null;
 framesWithShadowDraws:number;shadowMapRenderInvocations:number;
 framesWithReliableDrawCounts:number;note:string;
}>;
export type MainPassAttribution=Readonly<{
 frames:number;reliableFrames:number;drawCallsP95:number|null;
 uniqueMaterialsP95:number|null;opaqueDrawsP95:number|null;
 transparentDrawsP95:number|null;alphaTestDrawsP95:number|null;
 instancedDrawsP95:number|null;skinnedDrawsP95:number|null;
 bufferCallsP95:number|null;reconciledWithNonShadowFrames:number;
 dominantMaterialTypes:readonly {type:string;drawsTotal:number}[];
 dominantOwners:readonly {owner:string;drawsTotal:number}[];
 /** E6.18a: bounded source-family sample, not a full census. */
 dominantSources:readonly {source:string;observedDraws:number}[];
  /** E6.19 measured per-frame top 24 transparent cause/families. */
  dominantTransparentFamilies:readonly {family:string;observedDraws:number}[];
 topMaterialInstances:readonly {
  id:string;label:string;type:string;observedDraws:number
 }[];
 note:string;
}>;
export type LiveSceneAttribution=Readonly<{
 frames:number;
 /** All phases are CPU wall times, including native WebGL blocking. */
 phaseP95Ms:PerformanceSceneCosts;
 phaseWorstMs:PerformanceSceneCosts;
 actorPoseP95Ms:number|null;actorPosePrepP95Ms:number|null;
 actorAppearanceP95Ms:number|null;actorAllyContextP95Ms:number|null;
 fogComposeP95Ms:number|null;
 shadowRefreshesDuringSample:number;fogUploadsDuringSample:number;
 gpuDrawCallsP95:number|null;
 renderSubmission:LiveShadowSubmissionAttribution|null;
 mainPassAttribution:MainPassAttribution|null;
 note:string;
}>;
export type PostReadyRuntimeWindow=Readonly<{
 frames:number;gapsWithPrecedingFrame:number;interrupted:boolean;
 medianGapMs:number|null;p95GapMs:number|null;worstGapMs:number|null;
 medianCallbackMs:number|null;p95CallbackMs:number|null;
 worstCallbackMs:number|null;
 /** E6.14: same 90 actual callbacks, not a second instrumented loop. */
 p95SimMs?:number|null;p95SceneMs?:number|null;
 p95UiMs?:number|null;p95CanvasMs?:number|null;
 callbacksWithSimulation?:number;
 /** E6.15: present only when fine-grained scene profiling is enabled. */
 sceneAttribution?:LiveSceneAttribution|null;
 spikeCounts:Readonly<{priorCallback:number;betweenCallbacks:number;mixed:number}>;
 byMode:Readonly<Record<PostReadyRuntimeMode,PostReadyModeCounts>>;
 topGaps:readonly PostReadySpike[];
 note:string;
}>;
const modes:readonly PostReadyRuntimeMode[]=['live','idle','replay','suspended'];
const finite=(v:number)=>Number.isFinite(v)?Math.max(0,v):0;
const round=(v:number)=>Math.round(v*10)/10;
const percentile=(values:number[],p:number):number|null=>{
 if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b);
 return round(sorted[Math.max(0,Math.ceil(sorted.length*p)-1)]);
};
export function classifyPostReadyGap(
 previous:PostReadyRuntimeFrame,current:PostReadyRuntimeFrame
):PostReadySpike{
 const gap=finite(current.gapMs),prior=finite(previous.callbackMs);
 const outside=Math.max(0,gap-prior);
 const kind:PostReadySpike['kind']=prior>=Math.max(33.3,gap*.65)?
  'prior-callback':outside>=Math.max(33.3,gap*.5)?
   'between-callbacks':'mixed';
 const phases=previous.sceneBreakdown;
 const dominant=phases?PERFORMANCE_SCENE_PHASES.reduce((best,key)=>
  finite(phases[key])>finite(phases[best])?key:best,
  PERFORMANCE_SCENE_PHASES[0]):undefined;
 return {gapMs:round(gap),precedingCallbackMs:round(prior),
  outsidePrecedingCallbackMs:round(outside),
  precedingMode:previous.mode,currentMode:current.mode,
  precedingSceneMs:round(finite(previous.sceneMs)),
  precedingSimMs:round(finite(previous.simMs)),
  precedingUiMs:round(finite(previous.uiMs)),
  precedingCanvasMs:round(finite(previous.canvasMs)),
  precedingPostMs:round(finite(previous.postMs)),
  precedingSubmitted3D:previous.submitted3D,kind,
  ...(dominant&&phases?{precedingDominantScenePhase:dominant,
   precedingDominantScenePhaseMs:round(finite(phases[dominant]))}:{}),
  ...(previous.shadowSubmission?{
   precedingShadowRenderWallMs:round(finite(previous.shadowSubmission.shadowRenderWallMs)),
   precedingNonShadowWallMs:round(finite(previous.shadowSubmission.nonShadowWallMs))}:{})
 };
}
/** Captures exactly N runtime callbacks. Retains only the eight worst gaps,
 * never an unbounded trace or a per-frame replay of user input. */
export class PostReadyRuntimeCapture{
 private frames:PostReadyRuntimeFrame[]=[];
 private stopped=false;
 private interrupted=false;
 readonly limit:number;
 constructor(limit=90){this.limit=Math.max(1,Math.floor(limit));}
 get completed(){return this.stopped||this.frames.length>=this.limit;}
 add(frame:PostReadyRuntimeFrame):boolean{
  if(this.completed)return false;
  this.frames.push(frame);
  return this.frames.length===this.limit;
 }
 stopForInterruption():void{this.stopped=true;this.interrupted=true;}
 stopForVisibility():void{this.stopForInterruption();}
 finish():PostReadyRuntimeWindow{
  const frames=this.frames;
  const counts=Object.fromEntries(modes.map(mode=>
   [mode,{frames:0,over50ms:0,over100ms:0,submitted3D:0}])) as
    Record<PostReadyRuntimeMode,{
     frames:number;over50ms:number;over100ms:number;submitted3D:number}>;
  const spikeCounts={priorCallback:0,betweenCallbacks:0,mixed:0};
  const gaps:PostReadySpike[]=[];
  for(let i=0;i<frames.length;i++){
   const current=frames[i],c=counts[current.mode];
   c.frames++;
   if(current.submitted3D)c.submitted3D++;
   if(current.gapMs>50)c.over50ms++;
   if(current.gapMs>100)c.over100ms++;
   if(i===0)continue;
   const spike=classifyPostReadyGap(frames[i-1],current);
   if(spike.gapMs<=50)continue;
   if(spike.kind==='prior-callback')spikeCounts.priorCallback++;
   else if(spike.kind==='between-callbacks')spikeCounts.betweenCallbacks++;
   else spikeCounts.mixed++;
   gaps.push(spike);
  }
  gaps.sort((a,b)=>b.gapMs-a.gapMs);
  // Reuse snapshots from the existing, bounded actual tactical callback.
  // Never mistake cumulative texture or shadow counters for per-frame work.
  const detailed=frames.filter(f=>f.submitted3D&&!!f.sceneBreakdown);
  const sceneCost=(p:number,which:'p95'|'worst')=>
   Object.fromEntries(PERFORMANCE_SCENE_PHASES.map(key=>[key,
    which==='p95'?percentile(detailed.map(f=>finite(f.sceneBreakdown?.[key]??0)),p)??0:
     round(Math.max(0,...detailed.map(f=>finite(f.sceneBreakdown?.[key]??0))))
   ])) as PerformanceSceneCosts;
  const counterDelta=(key:'shadowRefreshes'|'fogTextureUploads')=>{
   let previous:number|undefined,total=0;
   for(const frame of detailed){
    const raw=frame[key];
    if(raw===undefined||!Number.isFinite(raw))continue;
    if(previous!==undefined&&raw>=previous)total+=raw-previous;
    previous=raw;
   }
   return total;
  };
  const submissions=detailed.flatMap(f=>f.shadowSubmission?[f.shadowSubmission]:[]);
  const reliable=submissions.filter(s=>s.drawCountsReliable);
  const submissionAttribution:LiveShadowSubmissionAttribution|null=
   submissions.length?{
    frames:submissions.length,
    shadowRenderP95Ms:percentile(submissions.map(s=>finite(s.shadowRenderWallMs)),.95),
    shadowRenderWorstMs:percentile(submissions.map(s=>finite(s.shadowRenderWallMs)),1),
    nonShadowP95Ms:percentile(submissions.map(s=>finite(s.nonShadowWallMs)),.95),
    nonShadowWorstMs:percentile(submissions.map(s=>finite(s.nonShadowWallMs)),1),
    shadowDrawCallsP95:percentile(reliable.map(s=>finite(s.shadowDrawCalls)),.95),
    nonShadowDrawCallsP95:percentile(reliable.map(s=>finite(s.nonShadowDrawCalls)),.95),
    framesWithShadowDraws:reliable.filter(s=>s.shadowDrawCalls>0).length,
    shadowMapRenderInvocations:submissions.reduce((n,s)=>n+s.shadowMapRenderInvocations,0),
    framesWithReliableDrawCounts:reliable.length,
    note:'Shadow-map render is synchronous CPU/driver wall time, not GPU timestamp duration. Other rendering includes main scene and possible post-effects. Draw calls count submissions, not GPU completion.'
   }:null;
  const mainFrames=detailed.flatMap(f=>f.mainPassSubmission?[f.mainPassSubmission]:[]);
  const types=new Map<string,number>();
  const owners=new Map<string,number>();
  const sources=new Map<string,number>();
   const transparentFamilies=new Map<string,number>();
  const materials=new Map<string,{
   id:string;label:string;type:string;observedDraws:number}>();
  for(const frame of mainFrames){
   for(const item of frame.materialTypes)
    types.set(item.type,(types.get(item.type)??0)+item.draws);
   for(const owner of frame.ownerDraws)
    owners.set(owner.owner,(owners.get(owner.owner)??0)+owner.draws);
   for(const source of frame.sourceDraws??[])
    sources.set(source.source,(sources.get(source.source)??0)+source.draws);
   for(const family of frame.transparentFamilies??[])
     transparentFamilies.set(family.family,
      (transparentFamilies.get(family.family)??0)+family.draws);
    for(const material of frame.topMaterials){
    const old=materials.get(material.id);
    if(old)old.observedDraws+=material.draws;
    else materials.set(material.id,{id:material.id,
      label:material.label,type:material.type,observedDraws:material.draws});
   }
  }
  const mainReliable=mainFrames.filter(f=>f.reliable);
  const reconciled=detailed.filter(f=>f.mainPassSubmission?.reliable&&
   f.shadowSubmission?.drawCountsReliable&&
   f.mainPassSubmission.drawCalls===f.shadowSubmission.nonShadowDrawCalls).length;
  const mainPassAttribution:MainPassAttribution|null=mainFrames.length?{
   frames:mainFrames.length,reliableFrames:mainReliable.length,
   drawCallsP95:percentile(mainReliable.map(f=>finite(f.drawCalls)),.95),
   uniqueMaterialsP95:percentile(mainReliable.map(f=>finite(f.uniqueMaterials)),.95),
   opaqueDrawsP95:percentile(mainReliable.map(f=>finite(f.opaqueDraws)),.95),
   transparentDrawsP95:percentile(mainReliable.map(f=>finite(f.transparentDraws)),.95),
   alphaTestDrawsP95:percentile(mainReliable.map(f=>finite(f.alphaTestDraws)),.95),
   instancedDrawsP95:percentile(mainReliable.map(f=>finite(f.instancedDraws)),.95),
   skinnedDrawsP95:percentile(mainReliable.map(f=>finite(f.skinnedDraws)),.95),
   bufferCallsP95:percentile(mainReliable.map(f=>finite(f.renderBufferCalls)),.95),
   reconciledWithNonShadowFrames:reconciled,
   dominantMaterialTypes:[...types].map(([type,drawsTotal])=>({type,drawsTotal}))
    .sort((a,b)=>b.drawsTotal-a.drawsTotal||a.type.localeCompare(b.type))
    .slice(0,10),
   dominantOwners:[...owners].map(([owner,drawsTotal])=>({owner,drawsTotal}))
    .sort((a,b)=>b.drawsTotal-a.drawsTotal||a.owner.localeCompare(b.owner)),
   dominantSources:[...sources].map(([source,observedDraws])=>({source,observedDraws}))
    .sort((a,b)=>b.observedDraws-a.observedDraws||a.source.localeCompare(b.source))
    .slice(0,16),
   dominantTransparentFamilies:[...transparentFamilies]
     .map(([family,observedDraws])=>({family,observedDraws}))
     .sort((a,b)=>b.observedDraws-a.observedDraws||a.family.localeCompare(b.family))
     .slice(0,24),
    topMaterialInstances:[...materials.values()].sort((a,b)=>
    b.observedDraws-a.observedDraws||a.id.localeCompare(b.id)).slice(0,12),
   note:'E6.19 separates measured transparent draw-source families by full-opacity façade foreground, cutaway, weather overlays, glass and roofs. Family counts pool top 24 per 90 frames and are sampled lower bounds. Full transparent draw count and shadow/main reconciliation remain unchanged. Diagnostic overhead prevents FPS or GPU timing claims.'
  }:null;
  const sceneAttribution:LiveSceneAttribution|null=detailed.length?{
   frames:detailed.length,
   phaseP95Ms:sceneCost(.95,'p95'),
   phaseWorstMs:sceneCost(1,'worst'),
   actorPoseP95Ms:percentile(detailed.map(f=>finite(f.actorBreakdown?.poseMs??0)),.95),
   actorPosePrepP95Ms:percentile(detailed.map(f=>finite(f.actorBreakdown?.posePrepMs??0)),.95),
   actorAppearanceP95Ms:percentile(detailed.map(f=>finite(f.actorBreakdown?.appearanceMs??0)),.95),
   actorAllyContextP95Ms:percentile(detailed.map(f=>finite(f.actorBreakdown?.allyContextMs??0)),.95),
   fogComposeP95Ms:percentile(detailed.map(f=>finite(f.fogComposeMs??0)),.95),
   shadowRefreshesDuringSample:counterDelta('shadowRefreshes'),
   fogUploadsDuringSample:counterDelta('fogTextureUploads'),
   gpuDrawCallsP95:percentile(detailed.map(f=>finite(f.gpuDrawCalls??0)),.95),
   renderSubmission:submissionAttribution,
   mainPassAttribution,
   note:'CPU only. The shadows phase prepares shadow update flags; shadow-map rasterization and GPU submission remain inside gpuSubmit wall time. No GPU timestamp or iPhone FPS measurement.'
  }:null;
  return {
   frames:frames.length,gapsWithPrecedingFrame:Math.max(0,frames.length-1),
   interrupted:this.interrupted,
   medianGapMs:percentile(frames.map(f=>finite(f.gapMs)),.5),
   p95GapMs:percentile(frames.map(f=>finite(f.gapMs)),.95),
   worstGapMs:frames.length?round(Math.max(...frames.map(f=>finite(f.gapMs)))):null,
   medianCallbackMs:percentile(frames.map(f=>finite(f.callbackMs)),.5),
   p95CallbackMs:percentile(frames.map(f=>finite(f.callbackMs)),.95),
   worstCallbackMs:frames.length?
    round(Math.max(...frames.map(f=>finite(f.callbackMs)))):null,
   p95SimMs:percentile(frames.map(f=>finite(f.simMs)),.95),
   p95SceneMs:percentile(frames.map(f=>finite(f.sceneMs)),.95),
   p95UiMs:percentile(frames.map(f=>finite(f.uiMs)),.95),
   p95CanvasMs:percentile(frames.map(f=>finite(f.canvasMs)),.95),
   callbacksWithSimulation:frames.filter(f=>f.simMs>0).length,
   sceneAttribution,
   spikeCounts,byMode:counts,topGaps:gaps.slice(0,8),
   note:'Each gap ends at the current RAF callback; the JS work that can fill it is from the PREVIOUS callback. Outside-preceding-callback time includes browser/other tasks, compositor scheduling, and possible driver waits, but is not proof of GPU cost. Measurements are JavaScript wall time; modes distinguish idle planning from live simulation. No network upload.'
  };
 }
}
