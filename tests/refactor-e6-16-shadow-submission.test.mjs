import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LiveShadowSubmitProfiler}
 from '../src/rendering/breach-live-shadow-submit-profiler.ts';
import {PostReadyRuntimeCapture,classifyPostReadyGap}
 from '../src/rendering/breach-post-ready-attribution.ts';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const frame=(i,shadowSubmission)=>({
 at:17*i,gapMs:17,callbackMs:18,simMs:3,recordingMs:0,uiMs:0,
 sceneMs:12,canvasMs:0,postMs:0,diagnosticsMs:0,mode:'live',
 viewMode:'iso',submitted3D:true,
 sceneBreakdown:{environment:1,camera:1,disclosure:1,actors:2,
 effects:1,fog:1,shadows:.1,postCamera:.1,gpuSubmit:8},
 shadowSubmission
});
test('E6.16 measures exactly one original render; preserves receiver and args',()=>{
 let clock=100,invocations=0;
 const renderer={info:{render:{calls:0}},shadowMap:{
  render(arg){
   assert.equal(this,renderer.shadowMap);assert.equal(arg,'unchanged');
   invocations++;clock+=6;renderer.info.render.calls+=3;
   return 42;
  }
 }};
 const profiler=new LiveShadowSubmitProfiler(renderer,()=>clock);
 assert.equal(profiler.installed,true);
 const result=profiler.capture(()=>{
  const answer=renderer.shadowMap.render('unchanged');
  clock+=4;renderer.info.render.calls+=7;return answer;
 });
 assert.equal(result,42);assert.equal(invocations,1);
 assert.deepEqual(profiler.last,{
  totalWallMs:10,shadowRenderWallMs:6,nonShadowWallMs:4,
  shadowMapRenderInvocations:1,shadowDrawCalls:3,
  nonShadowDrawCalls:7,totalDrawCalls:10,drawCountsReliable:true
 });
});
test('E6.16 unavailable hook and thrown render keep original semantics',()=>{
 const missing=new LiveShadowSubmitProfiler({info:{render:{calls:0}},shadowMap:{}});
 assert.equal(missing.installed,false);
 assert.equal(missing.capture(()=>17),17);assert.equal(missing.last,null);
 let clock=0;
 const renderer={info:{render:{calls:0}},shadowMap:{
  render(){clock+=2;throw Error('original shadow failure');}
 }};
 const profiler=new LiveShadowSubmitProfiler(renderer,()=>clock);
 assert.throws(()=>profiler.capture(()=>renderer.shadowMap.render()),/original shadow failure/);
 assert.equal(profiler.last.shadowMapRenderInvocations,1);
 assert.equal(profiler.last.shadowRenderWallMs,2);
});
test('E6.16 aggregates actual shadow/other render while preserving E6.15',()=>{
 const capture=new PostReadyRuntimeCapture(3);
 const sample=(shadow,other,draw)=>({
  totalWallMs:shadow+other,shadowRenderWallMs:shadow,
  nonShadowWallMs:other,shadowMapRenderInvocations:1,
  shadowDrawCalls:draw,nonShadowDrawCalls:10,
  totalDrawCalls:draw+10,drawCountsReliable:true
 });
 capture.add(frame(0,sample(2,5,8)));capture.add(frame(1,sample(4,7,0)));
 capture.add(frame(2,sample(3,6,12)));
 const result=capture.finish(),split=result.sceneAttribution.renderSubmission;
 assert.equal(split.frames,3);assert.equal(split.shadowRenderP95Ms,4);
 assert.equal(split.nonShadowP95Ms,7);assert.equal(split.shadowDrawCallsP95,12);
 assert.equal(split.framesWithShadowDraws,2);
 assert.equal(split.framesWithReliableDrawCounts,3);
 assert.equal(split.shadowMapRenderInvocations,3);
 assert.equal(result.sceneAttribution.phaseP95Ms.gpuSubmit,8);
 const spike=classifyPostReadyGap(frame(0,sample(2,5,8)),
  {...frame(1,sample(3,6,9)),gapMs:100});
 assert.equal(spike.precedingShadowRenderWallMs,2);
 assert.equal(spike.precedingNonShadowWallMs,5);
 const absent=new PostReadyRuntimeCapture(1);
 absent.add(frame(0,undefined));
 assert.equal(absent.finish().sceneAttribution.renderSubmission,null);
});
test('E6.16 opt-in only; no forced sync, GPU readback or extra RAF',()=>{
 const profiler=src('src/rendering/breach-live-shadow-submit-profiler.ts');
 assert.doesNotMatch(profiler,/\.finish\(|readPixels\(|getError\(|requestAnimationFrame\(/);
 const scene=src('src/breach-3d.ts'),loop=src('src/breach-runtime-loop.ts');
 assert.match(scene,/get\('coldBench'\)==='1'\?/);
 assert.match(scene,/this\.liveShadowSubmitProfiler\.capture\(/);
 assert.match(loop,/shadowSubmission:coldStats\?\.shadowSubmission\?/);
 assert.match(src('src/rendering/breach-post-ready-attribution.ts'),
  /renderSubmission:submissionAttribution/);
});
