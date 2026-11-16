import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PostReadyRuntimeCapture} from '../src/rendering/breach-post-ready-attribution.ts';
import {createColdDeviceEvidence} from '../src/rendering/breach-cold-device-evidence.ts';
import {parseBreachBootConfig} from '../src/breach-boot-config.ts';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const frame=(i,mode='live')=>({
 at:i*16,gapMs:16,callbackMs:10,simMs:3,recordingMs:1,
 uiMs:2,sceneMs:4,canvasMs:1,postMs:0,diagnosticsMs:0,
 mode,viewMode:'iso',submitted3D:true
});
test('E6.14 aggregates actual executing simulation and render slices',()=>{
 const capture=new PostReadyRuntimeCapture(90);
 for(let i=0;i<90;i++){
  assert.equal(capture.add({...frame(i),
   simMs:i===89?40:3,sceneMs:i===88?35:4,
   uiMs:i===87?28:2,canvasMs:i===86?25:1}),i===89);
 }
 const evidence=capture.finish();
 assert.equal(evidence.frames,90);
 assert.equal(evidence.byMode.live.frames,90);
 assert.equal(evidence.byMode.live.submitted3D,90);
 assert.equal(evidence.callbacksWithSimulation,90);
 assert.equal(evidence.p95SimMs,3);
 assert.equal(evidence.p95SceneMs,4);
 assert.equal(evidence.p95UiMs,2);
 assert.equal(evidence.p95CanvasMs,1);
 assert.equal(evidence.interrupted,false);
});
test('E6.14 stops short mission or hidden-tab live capture honestly',()=>{
 const capture=new PostReadyRuntimeCapture(90);
 capture.add(frame(1));capture.add(frame(2));
 capture.stopForInterruption();
 assert.equal(capture.completed,true);
 assert.equal(capture.finish().interrupted,true);
 assert.equal(capture.finish().byMode.live.frames,2);
 assert.equal(capture.add(frame(3)),false);
});
test('E6.14 uses canonical opt-in and same tactical RAF without another loop',()=>{
 const loader=src('src/breach-quickplay-controller.ts');
 assert.equal(parseBreachBootConfig('').coldBenchEnabled,false);
 assert.equal(parseBreachBootConfig('?coldBench=1').coldBenchEnabled,true);
 assert.match(loader,/if\(!liveExecutionStarted&&!hidden&&frame\.mode==='live'\)/);
 assert.match(loader,/liveExecutionCapture=new PostReadyRuntimeCapture\(90\)/);
 assert.match(loader,/frame\.mode!=='live'\)live\.stopForInterruption\(\)/);
 assert.match(loader,/evidence\.liveExecutionRuntime=live\.finish\(\)/);
 assert.match(loader,/postReadyRuntimeCapture=null;liveExecutionCapture=null/);
 assert.match(loader,/liveExecutionStarted=false;coldRuntimeEvidence=null/);
 assert.match(loader,/postReadyRuntimeCapture=new PostReadyRuntimeCapture\(90\)/);
 const runtime=src('src/breach-runtime-loop.ts');
 assert.match(runtime,/config\.boot\.coldBenchEnabled&&config\.recordColdRuntimeFrame/);
 assert.match(runtime,/mode:frameMode,viewMode,submitted3D:updated3d/);
 const module=src('src/rendering/breach-post-ready-attribution.ts');
 assert.doesNotMatch(module,/requestAnimationFrame\(|stepSession\(|\.render\(/);
});
test('E6.14 preserves E6.11 schema and adds optional live evidence',()=>{
 const result=createColdDeviceEvidence({seed:23,
  gpuWarmupEnabled:true,prewarmEnabled:true,trace:null,
  at:'2026-11-16T00:00:00Z',
  browser:{userAgent:'mobile browser',maxTouchPoints:5,hardwareConcurrency:4},
  viewport:{innerWidth:390,innerHeight:844,devicePixelRatio:3},
  phases:{generationMs:0,sessionMs:0,sceneMs:0,operatorMs:0,
   hudMs:0,preflightMs:0,shaderPreparationMs:0,firstFrameMs:0,totalMs:0}});
 assert.equal(result.schema,'fieldwork-e6.11-device-cold-v1');
 assert.equal(result.postReadyRuntime,null);
 assert.equal(result.liveExecutionRuntime,null);
 const collector=new PostReadyRuntimeCapture(2);
 collector.add(frame(1));collector.add(frame(2));
 result.liveExecutionRuntime=collector.finish();
 assert.equal(JSON.parse(JSON.stringify(result)).liveExecutionRuntime.byMode.live.frames,2);
});
