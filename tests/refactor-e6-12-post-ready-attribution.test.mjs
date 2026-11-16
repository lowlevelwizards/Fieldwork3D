import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PostReadyRuntimeCapture,classifyPostReadyGap}
 from '../src/rendering/breach-post-ready-attribution.ts';
import {parseBreachBootConfig} from '../src/breach-boot-config.ts';
import {createColdDeviceEvidence} from '../src/rendering/breach-cold-device-evidence.ts';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const frame=(at,gapMs,callbackMs,mode='idle',changes={})=>({
 at,gapMs,callbackMs,simMs:0,recordingMs:0,
 uiMs:3,sceneMs:callbackMs/2,canvasMs:2,postMs:0,
 diagnosticsMs:0,mode,viewMode:'iso',submitted3D:true,...changes
});
test('E6.12 attributes RAF interval to PREVIOUS callback, not current',()=>{
 const previous=frame(100,16,150,'idle',{sceneMs:120,submitted3D:true});
 const current=frame(260,160,2,'live',{sceneMs:1,submitted3D:false});
 const spike=classifyPostReadyGap(previous,current);
 assert.equal(spike.kind,'prior-callback');
 assert.equal(spike.precedingCallbackMs,150);
 assert.equal(spike.precedingSceneMs,120);
 assert.equal(spike.precedingMode,'idle');
 assert.equal(spike.currentMode,'live');
 assert.equal(spike.precedingSubmitted3D,true);
 const scheduling=classifyPostReadyGap(frame(100,16,5),
  frame(290,190,170));
 assert.equal(scheduling.kind,'between-callbacks');
 assert.equal(scheduling.precedingCallbackMs,5);
 assert.equal(scheduling.outsidePrecedingCallbackMs,185);
});
test('E6.12 bounded capture: 90 samples, separated mode bins and worst only',()=>{
 const collector=new PostReadyRuntimeCapture(90);
 for(let i=0;i<90;i++){
  const current=i<45?'idle':'live';
  const gap=i===40?180:i===70?145:16.7;
  const js=i===39?155:i===69?4:5;
  assert.equal(collector.add(frame(i*16.7,gap,js,current,
   {submitted3D:i%2===0})),i===89);
 }
 assert.equal(collector.completed,true);
 assert.equal(collector.add(frame(900,16,1)),false);
 const result=collector.finish();
 assert.equal(result.frames,90);
 assert.equal(result.gapsWithPrecedingFrame,89);
 assert.equal(result.byMode.idle.frames,45);
 assert.equal(result.byMode.live.frames,45);
 assert.equal(result.byMode.live.submitted3D,22);
 assert.equal(result.byMode.idle.over100ms,1);
 assert.equal(result.byMode.live.over100ms,1);
 assert.equal(result.spikeCounts.priorCallback,1);
 assert.equal(result.spikeCounts.betweenCallbacks,1);
 assert.equal(result.topGaps[0].gapMs,180);
 assert.equal(result.topGaps[0].precedingCallbackMs,155);
 assert.equal(result.topGaps[1].gapMs,145);
 assert.equal(result.topGaps.length,2);
});
test('E6.12 hidden tab produces incomplete labeled result and tiny memory',()=>{
 const collector=new PostReadyRuntimeCapture(100);
 collector.add(frame(10,16,4));
 collector.stopForVisibility();
 assert.equal(collector.completed,true);
 assert.equal(collector.add(frame(20,60,4)),false);
 const summary=collector.finish();
 assert.equal(summary.frames,1);
 assert.equal(summary.interrupted,true);
 assert.equal(summary.gapsWithPrecedingFrame,0);
 assert.deepEqual(summary.topGaps,[]);
 assert.equal(new PostReadyRuntimeCapture().limit,90);
});
test('E6.12 opt-in path uses real runtime work, no duplicate RAF loop',()=>{
 const loop=src('src/breach-runtime-loop.ts');
 const loader=src('src/breach-quickplay-controller.ts');
 const main=src('src/breach-main.ts');
 assert.equal(parseBreachBootConfig('').coldBenchEnabled,false);
 assert.match(loop,/config\.boot\.coldBenchEnabled&&config\.recordColdRuntimeFrame/);
 assert.match(loop,/callbackMs:Math\.max\(0,callbackEnd-/);
 assert.match(loop,/sceneMs:sceneUpdateEnd-perfRenderStart/);
 assert.match(loop,/mode:frameMode,viewMode,submitted3D:updated3d/);
 assert.match(main,/recordColdRuntimeFrame:frame=>quickPlayController\.recordRuntimeFrame\(frame\)/);
 assert.match(loader,/new PostReadyRuntimeCapture\(90\)/);
 assert.match(loader,/postReadyRuntimeCapture=null;liveExecutionCapture=null/);
 assert.match(loader,/liveExecutionStarted=false;coldRuntimeEvidence=null/);
 assert.match(loader,/document\.visibilityState==='hidden'/);
 assert.match(loader,/postReadyRuntime=planning\.finish\(\)/);
 const module=src('src/rendering/breach-post-ready-attribution.ts');
 assert.doesNotMatch(module,/requestAnimationFrame\(|stepSession\(|\.render\(/);
 assert.doesNotMatch(module,/fetch\(|sendBeacon\(|localStorage|sessionStorage/);
});
test('E6.12 uses a backward-compatible optional field in local JSON',()=>{
 const r=createColdDeviceEvidence({seed:23,gpuWarmupEnabled:true,
  prewarmEnabled:true,trace:null,at:'2026-11-16T00:00:00Z',
  browser:{userAgent:'iOS Safari',maxTouchPoints:5,hardwareConcurrency:6},
  viewport:{innerWidth:390,innerHeight:844,devicePixelRatio:3},
  phases:{generationMs:1,sessionMs:1,sceneMs:1,operatorMs:1,
   hudMs:1,preflightMs:1,shaderPreparationMs:1,firstFrameMs:1,totalMs:8}});
 assert.equal(r.schema,'fieldwork-e6.11-device-cold-v1');
 assert.equal(r.postReadyRuntime,null);
 r.postReadyRuntime=new PostReadyRuntimeCapture(1).finish();
 assert.equal(JSON.parse(JSON.stringify(r)).postReadyRuntime.frames,0);
});
