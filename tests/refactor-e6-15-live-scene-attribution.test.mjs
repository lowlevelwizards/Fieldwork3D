import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PostReadyRuntimeCapture,classifyPostReadyGap}
 from '../src/rendering/breach-post-ready-attribution.ts';
import {PERFORMANCE_SCENE_PHASES} from '../src/breach-performance-timeline.ts';
import {parseBreachBootConfig} from '../src/breach-boot-config.ts';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const phases=(gpuSubmit=4,actors=3)=>({
 environment:1,camera:1,disclosure:1,actors,effects:1,
 fog:2,shadows:.5,postCamera:.5,gpuSubmit
});
const frame=(i,changes={})=>({
 at:i*17,gapMs:17,callbackMs:20,simMs:2,recordingMs:0,
 uiMs:.5,sceneMs:14,canvasMs:1,postMs:0,diagnosticsMs:0,
 mode:'live',viewMode:'iso',submitted3D:true,
 sceneBreakdown:phases(),actorBreakdown:{
  rigMs:0,rigBuilds:0,poseMs:1.5,poseCount:4,
  posePrepMs:.75,appearanceMs:.25,allyContextMs:.3
 },fogComposeMs:1.2,shadowRefreshes:100+i,
 fogTextureUploads:20+i,gpuDrawCalls:71,...changes
});
test('E6.15 uses P1.5 real scene phases and reports full phase p95/worst',()=>{
 const capture=new PostReadyRuntimeCapture(90);
 for(let i=0;i<90;i++)capture.add(frame(i,i===89?{
  sceneBreakdown:phases(66,45),actorBreakdown:{
   rigMs:0,rigBuilds:0,poseMs:30,poseCount:4,
   posePrepMs:19,appearanceMs:10,allyContextMs:8
  },fogComposeMs:11,gpuDrawCalls:900
 }:{}));
 const result=capture.finish(),detail=result.sceneAttribution;
 assert.ok(detail);
 assert.equal(result.frames,90);
 assert.equal(detail.frames,90);
 assert.deepEqual(Object.keys(detail.phaseP95Ms),PERFORMANCE_SCENE_PHASES);
 assert.equal(detail.phaseP95Ms.gpuSubmit,4);
 assert.equal(detail.phaseWorstMs.gpuSubmit,66);
 assert.equal(detail.phaseP95Ms.actors,3);
 assert.equal(detail.phaseWorstMs.actors,45);
 assert.equal(detail.actorPoseP95Ms,1.5);
 assert.equal(detail.actorPosePrepP95Ms,.8);
 assert.equal(detail.actorAppearanceP95Ms,.3);
 assert.equal(detail.actorAllyContextP95Ms,.3);
 assert.equal(detail.fogComposeP95Ms,1.2);
 assert.equal(detail.shadowRefreshesDuringSample,89);
 assert.equal(detail.fogUploadsDuringSample,89);
 assert.equal(detail.gpuDrawCallsP95,71);
});
test('E6.15 resets cumulative counters, and does not invent skipped 3D work',()=>{
 const capture=new PostReadyRuntimeCapture(5);
 capture.add(frame(0,{shadowRefreshes:100,fogTextureUploads:30}));
 capture.add(frame(1,{shadowRefreshes:101,fogTextureUploads:32}));
 capture.add(frame(2,{submitted3D:false,sceneBreakdown:undefined,
  actorBreakdown:undefined,shadowRefreshes:undefined,
  fogTextureUploads:undefined}));
 capture.add(frame(3,{shadowRefreshes:1,fogTextureUploads:1}));
 capture.add(frame(4,{shadowRefreshes:3,fogTextureUploads:4}));
 const detail=capture.finish().sceneAttribution;
 assert.equal(detail.frames,4);
 assert.equal(detail.shadowRefreshesDuringSample,3);
 assert.equal(detail.fogUploadsDuringSample,5);
 const noScene=new PostReadyRuntimeCapture(1);
 noScene.add(frame(0,{sceneBreakdown:undefined}));
 assert.equal(noScene.finish().sceneAttribution,null);
});
test('E6.15 worst RAF gap attributes the PRECEDING scene phase',()=>{
 const prev=frame(0,{callbackMs:200,sceneBreakdown:phases(170,12)});
 const current=frame(1,{gapMs:212,callbackMs:2,
  sceneBreakdown:phases(1,60)});
 const spike=classifyPostReadyGap(prev,current);
 assert.equal(spike.kind,'prior-callback');
 assert.equal(spike.precedingDominantScenePhase,'gpuSubmit');
 assert.equal(spike.precedingDominantScenePhaseMs,170);
 assert.equal(spike.precedingCallbackMs,200);
});
test('E6.15 capture is explicit and uses no duplicate simulation or WebGL sync',()=>{
 assert.equal(parseBreachBootConfig('').coldBenchEnabled,false);
 assert.equal(parseBreachBootConfig('?coldBench=1').coldBenchEnabled,true);
 const scene=src('src/breach-3d.ts'),loop=src('src/breach-runtime-loop.ts');
 assert.match(scene,/params\.get\('coldBench'\)==='1'/);
 assert.match(scene,/this\.profileSceneUpdate/);
 assert.match(loop,/if\(config\.boot\.coldBenchEnabled&&config\.recordColdRuntimeFrame\)/);
 assert.match(loop,/!!perfOverlay\|\|config\.boot\.coldBenchEnabled/);
 assert.match(loop,/sceneBreakdown:coldStats\?\.scenePhases\?\{\.\.\.coldStats\.scenePhases\}:undefined/);
 assert.match(loop,/actorBreakdown:coldStats\?\.actorPhaseCosts\?\{\.\.\.coldStats\.actorPhaseCosts\}:undefined/);
 assert.match(loop,/fogTextureUploads:coldStats\?\.fogTextureSubmittedUploads/);
 const module=src('src/rendering/breach-post-ready-attribution.ts');
 assert.doesNotMatch(module,/requestAnimationFrame\(|stepSession\(|\.render\(/);
 assert.doesNotMatch(module,/fetch\(|sendBeacon\(|localStorage|sessionStorage/);
});
