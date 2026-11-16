import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseBreachBootConfig} from '../src/breach-boot-config.ts';
import {
 summarizeColdGlCalls,summarizeColdFrameIntervals,
 captureColdReadyFrameIntervals,createColdDeviceEvidence
} from '../src/rendering/breach-cold-device-evidence.ts';

const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('E6.11 cold device bench is strictly explicit and A2 boot-parsed',()=>{
 assert.equal(parseBreachBootConfig('').coldBenchEnabled,false);
 assert.equal(parseBreachBootConfig('?coldBench=0').coldBenchEnabled,false);
 assert.equal(parseBreachBootConfig('?coldBench=1').coldBenchEnabled,true);
 assert.equal(parseBreachBootConfig('?coldBench').coldBenchEnabled,false);
 const loader=src('src/breach-quickplay-controller.ts');
 assert.match(loader,/if\(config\.boot\.coldBenchEnabled\)/);
 assert.match(loader,/createColdDeviceEvidence\(/);
 assert.match(loader,/mountColdDeviceExport\(benchmark\)/);
 assert.match(loader,/captureColdReadyFrameIntervals\(90\)/);
 assert.match(loader,/__fieldworkE611/);
 assert.ok(loader.indexOf('quickPlayBusy=false;\n    finishQuickPlayClock();')<
  loader.indexOf('if(config.boot.coldBenchEnabled)'));
 assert.doesNotMatch(loader,/get\('coldBench'\)/);
});

test('E6.11 partitions measured WebGL calls without losing opaque native time',()=>{
 const capture={phase:'firstFrame',wallMs:100,
  resourcesBefore:{programs:40,geometries:2,textures:1},
  resourcesAfter:{programs:42,geometries:3,textures:2},
  calls:{getProgramInfoLog:{count:4,cpuWallMs:32},
   getShaderInfoLog:{count:1,cpuWallMs:3},
   linkProgram:{count:2,cpuWallMs:7},
   bufferData:{count:3,cpuWallMs:8},
   texImage2D:{count:1,cpuWallMs:4},
   drawElements:{count:4,cpuWallMs:2},
   getExtension:{count:3,cpuWallMs:6},
   bindFramebuffer:{count:1,cpuWallMs:5}}};
 const s=summarizeColdGlCalls(capture);
 assert.equal(s.programInfoLogMs,35);
 assert.equal(s.shaderSetupMs,7);
 assert.equal(s.bufferUploadMs,8);
 assert.equal(s.textureUploadMs,4);
 assert.equal(s.drawSubmissionMs,2);
 assert.equal(s.extensionMs,6);
 assert.equal(s.otherHookMs,5);
 assert.equal(s.unmeasuredWallMs,33);
 assert.equal(s.callCount,19);
 assert.equal(s.programsAfter,42);
});

test('E6.11 frame intervals robust to zeros, invalid values and interruptions',()=>{
 const s=summarizeColdFrameIntervals([16,18,55,105,NaN,Infinity,-2]);
 assert.equal(s.frames,4);
 assert.equal(s.medianMs,18);
 assert.equal(s.p95Ms,105);
 assert.equal(s.worstMs,105);
 assert.equal(s.over50ms,2);
 assert.equal(s.over100ms,1);
 assert.equal(s.interrupted,false);
 assert.equal(summarizeColdFrameIntervals([],true).medianMs,null);
 assert.equal(summarizeColdFrameIntervals([],true).interrupted,true);
});

test('E6.11 bounded RAF capture stops at N samples and hidden tab',async()=>{
 let now=0,queued=[];
 const doc={visibilityState:'visible'};
 const raf=fn=>{queued.push(fn);return queued.length;};
 const capture=captureColdReadyFrameIntervals(3,doc,raf);
 for(let i=0;i<4;i++){const next=queued.shift();assert.ok(next);
  now+=17;next(now);}
 assert.equal((await capture).frames,3);
 assert.equal(queued.length,0);
 const stopped=captureColdReadyFrameIntervals(3,doc,raf);
 doc.visibilityState='hidden';queued.shift()(30);
 assert.equal((await stopped).interrupted,true);
});

test('E6.11 payload includes opt-in hardware metadata without automatic transport',()=>{
 const phases={generationMs:10,sessionMs:11,sceneMs:12,
  operatorMs:13,hudMs:14,preflightMs:15,
  shaderPreparationMs:16,firstFrameMs:17,totalMs:18};
 const r=createColdDeviceEvidence({seed:23,gpuWarmupEnabled:true,
  prewarmEnabled:true,phases,trace:null,at:'2026-11-16T00:00:00Z',
  browser:{userAgent:'Safari iPhone',maxTouchPoints:5,
   hardwareConcurrency:6},viewport:{innerWidth:390,innerHeight:844,
   devicePixelRatio:3}});
 assert.equal(r.schema,'fieldwork-e6.11-device-cold-v1');
 assert.equal(r.run.instrumentedWebGl,false);
 assert.equal(r.device.viewport.dpr,3);
 assert.equal(r.device.touchPoints,5);
 assert.equal(r.postReadyFrames,null);
 assert.equal(r.glPhases,null);
 const module=src('src/rendering/breach-cold-device-evidence.ts');
 assert.match(module,/button\.addEventListener\('click'/);
 assert.match(module,/URL\.createObjectURL/);
 assert.doesNotMatch(module,/fetch\(|sendBeacon\(|localStorage|sessionStorage/);
});
