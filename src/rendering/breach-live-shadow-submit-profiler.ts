/** E6.16: observe a real tactical renderer shadow-map call, without
 * additional frames, WebGL sync, readback, or visual/behavioral changes.
 * CPU/driver wall time is NOT actual GPU execution time.
 */
export type LiveShadowSubmissionSample=Readonly<{
 totalWallMs:number;shadowRenderWallMs:number;nonShadowWallMs:number;
 shadowMapRenderInvocations:number;shadowDrawCalls:number;
 nonShadowDrawCalls:number;totalDrawCalls:number;drawCountsReliable:boolean;
}>;
type RendererLike={shadowMap:{render?:(...args:unknown[])=>unknown};
 info:{render:{calls:number}}};
const elapsed=(end:number,start:number)=>Math.max(0,end-start);
export class LiveShadowSubmitProfiler{
 readonly installed:boolean=false;
 last:LiveShadowSubmissionSample|null=null;
 private capturing=false;private shadowWall=0;private shadowDraws=0;
 private invocations=0;private reliable=true;
 private shadowPassDepth=0;
 get isShadowPass():boolean{return this.shadowPassDepth>0;}
 private readonly renderer:RendererLike;
 private readonly now:()=>number;
 constructor(renderer:RendererLike,now:()=>number=()=>performance.now()){
  this.renderer=renderer;this.now=now;
  const target=renderer.shadowMap,original=target.render;
  if(typeof original!=='function')return;
  const profiler=this;
  try{
   target.render=function(this:unknown,...args:unknown[]){
    if(!profiler.capturing)return Reflect.apply(original,this,args);
    const started=profiler.now(),before=renderer.info.render.calls;
    profiler.shadowPassDepth++;
    try{return Reflect.apply(original,this,args);}
    finally{
     profiler.shadowPassDepth--;
     profiler.shadowWall+=elapsed(profiler.now(),started);
     profiler.invocations++;
     const after=renderer.info.render.calls;
     if(Number.isFinite(before)&&Number.isFinite(after)&&after>=before)
      profiler.shadowDraws+=after-before;
     else profiler.reliable=false;
    }
   };
   this.installed=target.render!==original;
  }catch{
   // If this Three version does not expose a writable hook, leave
   // rendering intact and report no split instead of inventing zeros.
  }
 }
 capture<T>(render:()=>T):T{
  if(!this.installed)return render();
  if(this.capturing)throw Error('Nested E6.16 render capture');
  this.capturing=true;this.last=null;this.shadowWall=0;
  this.shadowDraws=0;this.invocations=0;this.reliable=true;
  const started=this.now();
  try{return render();}
  finally{
   const total=elapsed(this.now(),started);
   const calls=this.renderer.info.render.calls;
   const valid=Number.isFinite(calls)&&calls>=0&&
    this.reliable&&calls>=this.shadowDraws;
   this.last={totalWallMs:total,shadowRenderWallMs:this.shadowWall,
    nonShadowWallMs:Math.max(0,total-this.shadowWall),
    shadowMapRenderInvocations:this.invocations,
    shadowDrawCalls:this.shadowDraws,
    nonShadowDrawCalls:valid?calls-this.shadowDraws:0,
    totalDrawCalls:Number.isFinite(calls)?Math.max(0,calls):0,
    drawCountsReliable:valid};
   this.capturing=false;
  }
 }
}
