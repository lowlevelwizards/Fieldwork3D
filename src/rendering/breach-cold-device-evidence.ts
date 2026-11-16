/** E6.11: local, explicitly requested cold-start diagnostics for real devices.
 * No telemetry upload, WebGL sync, OS location, hardware ID or persistence.
 * A JSON export is triggered only by the user's direct button tap.
 * Without ?coldBench=1 none of this module runs during startup.
 */
import type {RendererStartupEvidence,RendererStartupCapture}
 from './breach-cold-renderer-trace.ts';

export type ColdStartupPhaseTimes=Readonly<{
 generationMs:number;sessionMs:number;sceneMs:number;
 operatorMs:number;hudMs:number;preflightMs:number;
 shaderPreparationMs:number;firstFrameMs:number;totalMs:number;
}>;
export type ColdFrameIntervalSummary=Readonly<{
 frames:number;medianMs:number|null;p95Ms:number|null;worstMs:number|null;
 over50ms:number;over100ms:number;interrupted:boolean;
}>;
export type ColdGlCallSummary=Readonly<{
 phase:string;wallMs:number;programInfoLogMs:number;
 shaderSetupMs:number;bufferUploadMs:number;textureUploadMs:number;
 drawSubmissionMs:number;extensionMs:number;otherHookMs:number;
 unmeasuredWallMs:number;programsBefore:number;programsAfter:number;
 callCount:number
}>;
export type ColdDeviceEvidence={
 schema:'fieldwork-e6.11-device-cold-v1';
 run:{seed:number;prewarmEnabled:boolean;gpuWarmupEnabled:boolean;
  instrumentedWebGl:boolean;captureTimeUtc:string};
 device:{userAgent:string;viewport:{width:number;height:number;dpr:number};
  touchPoints:number;hardwareConcurrency:number|null};
 phases:ColdStartupPhaseTimes;
 glPhases:ColdGlCallSummary[]|null;
 postReadyFrames:ColdFrameIntervalSummary|null;
 note:string;
};

const CALL_GROUPS=Object.freeze({
 programInfoLog:['getProgramInfoLog','getShaderInfoLog'],
 shaderSetup:['createShader','shaderSource','compileShader','createProgram',
  'attachShader','linkProgram','getProgramParameter','getShaderParameter','useProgram'],
 bufferUpload:['createBuffer','bufferData','bufferSubData'],
 textureUpload:['createTexture','texImage2D','texSubImage2D','texImage3D',
  'texSubImage3D','compressedTexImage2D','compressedTexImage3D',
  'texStorage2D','texStorage3D','generateMipmap'],
 drawSubmission:['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced'],
 extension:['getExtension']
});
export function summarizeColdGlCalls(capture:RendererStartupCapture):ColdGlCallSummary{
 const sum=(names:readonly string[])=>names.reduce((total,k)=>
   total+(capture.calls[k]?.cpuWallMs??0),0);
 const grouped=new Set(Object.values(CALL_GROUPS).flat());
 const byGroup={
  programInfoLogMs:sum(CALL_GROUPS.programInfoLog),
  shaderSetupMs:sum(CALL_GROUPS.shaderSetup),
  bufferUploadMs:sum(CALL_GROUPS.bufferUpload),
  textureUploadMs:sum(CALL_GROUPS.textureUpload),
  drawSubmissionMs:sum(CALL_GROUPS.drawSubmission),
  extensionMs:sum(CALL_GROUPS.extension)
 };
 const otherHookMs=Object.entries(capture.calls).reduce((total,[name,call])=>
  total+(grouped.has(name)?0:call.cpuWallMs),0);
 const attributed=Object.values(byGroup).reduce((t,v)=>t+v,otherHookMs);
 return {phase:capture.phase,wallMs:capture.wallMs,...byGroup,otherHookMs,
  // Not JS-only time: WebGL can have uninstrumented driver/native stalls.
  unmeasuredWallMs:Math.max(0,capture.wallMs-attributed),
  programsBefore:capture.resourcesBefore.programs,
  programsAfter:capture.resourcesAfter.programs,
  callCount:Object.values(capture.calls).reduce((t,c)=>t+c.count,0)};
}
const round=(n:number)=>Math.round(n*10)/10;
const percentile=(sorted:number[],p:number)=>
 sorted[Math.max(0,Math.ceil(sorted.length*p)-1)];
export function summarizeColdFrameIntervals(
 intervals:readonly number[],interrupted=false
):ColdFrameIntervalSummary{
 const finite=intervals.filter(n=>Number.isFinite(n)&&n>=0).
  slice().sort((a,b)=>a-b);
 return {frames:finite.length,
  medianMs:finite.length?round(percentile(finite,.5)):null,
  p95Ms:finite.length?round(percentile(finite,.95)):null,
  worstMs:finite.length?round(finite[finite.length-1]):null,
  over50ms:finite.filter(n=>n>50).length,
  over100ms:finite.filter(n=>n>100).length,interrupted};
}

/** RAF intervals include scheduling and browser compositor vsync; never
 * present these values as GPU timing or actual simulation CPU time.
 * Stop in hidden tabs, with one bounded allocation per explicit capture.
 */
export async function captureColdReadyFrameIntervals(
 frames=90,doc:Pick<Document,'visibilityState'>=document,
 raf:typeof requestAnimationFrame=requestAnimationFrame
):Promise<ColdFrameIntervalSummary>{
 const intervals:number[]=[];
 let previous:number|null=null;
 return new Promise(resolve=>{
  function next(now:number){
   if(doc.visibilityState==='hidden'){
    resolve(summarizeColdFrameIntervals(intervals,true));return;
   }
   if(previous!==null)intervals.push(Math.max(0,now-previous));
   previous=now;
   if(intervals.length>=frames){
    resolve(summarizeColdFrameIntervals(intervals));return;
   }
   raf(next);
  }
  if(frames<=0){resolve(summarizeColdFrameIntervals([]));return;}
  raf(next);
 });
}
export function createColdDeviceEvidence(input:{
 seed:number;gpuWarmupEnabled:boolean;prewarmEnabled:boolean;
 phases:ColdStartupPhaseTimes;trace:RendererStartupEvidence|null;
 browser?:Pick<Navigator,'userAgent'|'maxTouchPoints'|'hardwareConcurrency'>;
 viewport?:{innerWidth:number;innerHeight:number;devicePixelRatio:number};
 at?:string;
}):ColdDeviceEvidence{
 const nav=input.browser??navigator;
 const viewport=input.viewport??window;
 return {
  schema:'fieldwork-e6.11-device-cold-v1',
  run:{seed:input.seed,prewarmEnabled:input.prewarmEnabled,
   gpuWarmupEnabled:input.gpuWarmupEnabled,
   instrumentedWebGl:!!input.trace,captureTimeUtc:input.at??new Date().toISOString()},
  device:{userAgent:nav.userAgent,
   viewport:{width:viewport.innerWidth,height:viewport.innerHeight,
    dpr:viewport.devicePixelRatio},
   touchPoints:nav.maxTouchPoints,
   hardwareConcurrency:nav.hardwareConcurrency??null},
  phases:input.phases,
  glPhases:input.trace?input.trace.captures.map(summarizeColdGlCalls):null,
  postReadyFrames:null,
  note:'Local opt-in diagnostics only. Startup and WebGL call times are JavaScript/driver wall time, not GPU elapsed time; RAF intervals include scheduler/compositor stalls. With gpuTrace=1 measurement overhead is added. Run a fresh page per comparison, do not compare a warm second run to cold start. The file is never automatically uploaded.'
 };
}

/** One floating diagnostics export; created only by explicit ?coldBench=1.
 * Generates local download from a user click, never automatic transfer.
 */
export function mountColdDeviceExport(evidence:ColdDeviceEvidence,
 root:Pick<Document,'createElement'|'body'|'getElementById'>=document):void{
 root.getElementById('fieldworkColdBenchExport')?.remove();
 const button=root.createElement('button');
 button.id='fieldworkColdBenchExport';
 button.type='button';
 button.setAttribute('aria-label','Export cold start benchmark JSON');
 button.textContent='SAVE COLD BENCH';
 button.style.cssText='position:fixed;right:8px;bottom:12px;'+
  'z-index:2147483646;padding:9px 12px;background:#14282b;'+
  'color:#f2f4ea;border:1px solid #98a9a0;border-radius:7px;'+
  'font:600 12px system-ui;max-width:45vw;touch-action:manipulation';
 button.addEventListener('click',()=>{
  const json=JSON.stringify(evidence,null,2)+'\n';
  const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
  const anchor=root.createElement('a');
  anchor.href=url;
  anchor.download='fieldwork-cold-'+evidence.run.seed+'-'+
   (evidence.run.prewarmEnabled?'on':'off')+'.json';
  root.body.appendChild(anchor);
  anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
 });
 root.body.appendChild(button);
}
