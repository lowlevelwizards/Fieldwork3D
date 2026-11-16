/** E6.8: opt-in, cold-start WebGL *CPU call* attribution.
 * Never calls finish/getError/query timers, reads shader source or changes
 * WebGL arguments. Counts and wall-clock times are NOT GPU execution times.
 * Hooks are removed after first-frame capture. Off in ordinary gameplay.
 */
export type RendererStartupResources=Readonly<{
 programs:number;geometries:number;textures:number
}>;
export type RendererStartupCall=Readonly<{count:number;cpuWallMs:number}>;
export type RendererStartupCapture=Readonly<{
 phase:'compileAsync'|'firstFrame';wallMs:number;
 resourcesBefore:RendererStartupResources;
 resourcesAfter:RendererStartupResources;
 calls:Readonly<Record<string,RendererStartupCall>>
}>;
export type RendererStartupEvidence=Readonly<{
 schema:'fieldwork-e6.8-cold-renderer-v1';
 rendererConstructorMs:number;
 installedHooks:readonly string[];
 skippedHooks:readonly string[];
 captures:readonly RendererStartupCapture[];
 note:string
}>;

// Include program status checks because the browser/driver may block there,
// separately from compileShader/linkProgram submission. Exclude synchronous
// GL finish/readback probes: instrumentation must not create GPU stalls.
export const COLD_GL_METHODS=Object.freeze([
 'createShader','shaderSource','compileShader','createProgram',
 'attachShader','linkProgram','getProgramParameter','getShaderParameter',
 'useProgram','createBuffer','bufferData','bufferSubData',
 'createTexture','texImage2D','texSubImage2D','texImage3D','texSubImage3D',
 'compressedTexImage2D','compressedTexImage3D','texStorage2D',
 'texStorage3D','generateMipmap','createFramebuffer','framebufferTexture2D',
 'createRenderbuffer','renderbufferStorage','drawArrays','drawElements',
 'drawArraysInstanced','drawElementsInstanced'
] as const);

type Phase=RendererStartupCapture['phase'];
type CallCounter={count:number;cpuWallMs:number};
type WebGlMethods=Record<string,unknown>;
export class ColdRendererTrace{
 private active:Phase|null=null;
 private counts:Record<string,CallCounter>={};
 private captures:RendererStartupCapture[]=[];
 private original:Array<{name:string;method:(...args:unknown[])=>unknown;
   hadOwn:boolean}>=[];
 readonly installedHooks:string[]=[];
 readonly skippedHooks:string[]=[];
 readonly rendererConstructorMs:number;
 private readonly gl:WebGLRenderingContext|WebGL2RenderingContext;
 private readonly resources:()=>RendererStartupResources;
 private readonly now:()=>number;
 closed=false;
 constructor(
  gl:WebGLRenderingContext|WebGL2RenderingContext,
  rendererConstructorMs:number,
  resources:()=>RendererStartupResources,
  now:()=>number=()=>performance.now()
 ){
  this.gl=gl;this.rendererConstructorMs=rendererConstructorMs;
  this.resources=resources;this.now=now;
  const target=gl as unknown as WebGlMethods;
  for(const name of COLD_GL_METHODS){
   const value=target[name];
   if(typeof value!=='function'){this.skippedHooks.push(name);continue;}
   const original=value as (...args:unknown[])=>unknown;
   const hadOwn=Object.prototype.hasOwnProperty.call(target,name);
   const trace=this;
   try{
    target[name]=function(this:unknown,...args:unknown[]){
     if(!trace.active)return Reflect.apply(original,gl,args);
     const started=trace.now();
     try{return Reflect.apply(original,gl,args);}
     finally{
      const entry=trace.counts[name]??(trace.counts[name]={
       count:0,cpuWallMs:0
      });
      entry.count++;
      entry.cpuWallMs+=Math.max(0,trace.now()-started);
     }
    };
    if(target[name]===value){this.skippedHooks.push(name);continue;}
    this.original.push({name,method:original,hadOwn});
    this.installedHooks.push(name);
   }catch{this.skippedHooks.push(name);}
  }
 }
 private begin(phase:Phase){
  if(this.closed)throw Error('Cold WebGL trace was already finalized');
  if(this.active)throw Error('Nested cold WebGL trace phases are unsupported');
  this.counts={};this.active=phase;
  return {started:this.now(),before:this.resources()};
 }
 private end(phase:Phase,started:number,before:RendererStartupResources){
  const wallMs=Math.max(0,this.now()-started);
  const calls:Record<string,RendererStartupCall>={};
  for(const [name,entry] of Object.entries(this.counts))
   calls[name]={count:entry.count,cpuWallMs:entry.cpuWallMs};
  this.captures.push({phase,wallMs,resourcesBefore:before,
   resourcesAfter:this.resources(),calls});
  this.active=null;this.counts={};
 }
 capture<T>(phase:Phase,work:()=>T):T{
  const {started,before}=this.begin(phase);
  try{return work();}
  finally{this.end(phase,started,before);}
 }
 async captureAsync<T>(phase:Phase,work:()=>Promise<T>):Promise<T>{
  const {started,before}=this.begin(phase);
  try{return await work();}
  finally{this.end(phase,started,before);}
 }
 finish():RendererStartupEvidence{
  if(this.active)throw Error('Cannot finalize active cold renderer phase');
  if(!this.closed){
   const target=this.gl as unknown as WebGlMethods;
   for(const {name,method,hadOwn} of this.original){
    try{
     if(hadOwn)target[name]=method;
     else delete target[name];
    }catch{target[name]=method;}
   }
   this.closed=true;
  }
  return {
   schema:'fieldwork-e6.8-cold-renderer-v1',
   rendererConstructorMs:this.rendererConstructorMs,
   installedHooks:[...this.installedHooks],
   skippedHooks:[...this.skippedHooks],
   captures:[...this.captures],
   note:'All times are browser JavaScript wall time (GL call wall time includes any driver wait), not measured GPU execution. compileAsync wall time can include asynchronous waiting. Three.js program/geometry/texture counts are resource counters, not shader cost or bytes.'
  };
 }
}
