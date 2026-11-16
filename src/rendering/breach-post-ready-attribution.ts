/** E6.12: bounded, opt-in correlation of real tactical-loop callbacks
 * with the RAF interval ending at the NEXT callback.
 * Callbacks are wall times, not CPU utilization or GPU execution time.
 */
export type PostReadyRuntimeMode='live'|'idle'|'replay'|'suspended';
export type PostReadyRuntimeFrame=Readonly<{
 at:number;gapMs:number;callbackMs:number;
 simMs:number;recordingMs:number;uiMs:number;
 sceneMs:number;canvasMs:number;postMs:number;diagnosticsMs:number;
 mode:PostReadyRuntimeMode;viewMode:string;submitted3D:boolean;
}>;
export type PostReadySpike=Readonly<{
 gapMs:number;precedingCallbackMs:number;
 outsidePrecedingCallbackMs:number;
 precedingMode:PostReadyRuntimeMode;currentMode:PostReadyRuntimeMode;
 precedingSceneMs:number;precedingSimMs:number;precedingUiMs:number;
 precedingCanvasMs:number;precedingPostMs:number;
 precedingSubmitted3D:boolean;kind:'prior-callback'|'between-callbacks'|'mixed';
}>;
export type PostReadyModeCounts=Readonly<{
 frames:number;over50ms:number;over100ms:number;submitted3D:number;
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
 return {gapMs:round(gap),precedingCallbackMs:round(prior),
  outsidePrecedingCallbackMs:round(outside),
  precedingMode:previous.mode,currentMode:current.mode,
  precedingSceneMs:round(finite(previous.sceneMs)),
  precedingSimMs:round(finite(previous.simMs)),
  precedingUiMs:round(finite(previous.uiMs)),
  precedingCanvasMs:round(finite(previous.canvasMs)),
  precedingPostMs:round(finite(previous.postMs)),
  precedingSubmitted3D:previous.submitted3D,kind};
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
   spikeCounts,byMode:counts,topGaps:gaps.slice(0,8),
   note:'Each gap ends at the current RAF callback; the JS work that can fill it is from the PREVIOUS callback. Outside-preceding-callback time includes browser/other tasks, compositor scheduling, and possible driver waits, but is not proof of GPU cost. Measurements are JavaScript wall time; modes distinguish idle planning from live simulation. No network upload.'
  };
 }
}
