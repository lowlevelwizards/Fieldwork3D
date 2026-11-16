import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeColdCpuProfile}
 from '../scripts/verification/e6-9-cold-cpu-analysis.mjs';

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const node=(id,parent,functionName,url='')=>({id,parent,callFrame:{
 functionName,url,scriptId:'0',lineNumber:0,columnNumber:0},hitCount:0,children:[]});

test('E6.9 profile summary attributes samples, preserves native/idle and ranks leaves',()=>{
 const sample={
  startTime:1000000,endTime:1030000,
  nodes:[
   node(1,undefined,'(root)'),
   node(2,1,'render','/node_modules/three/build/three.module.js'),
   node(3,2,'projectObject','/node_modules/three/build/three.module.js'),
   node(4,2,'getProgram','/node_modules/three/build/three.module.js'),
   node(5,1,'update','http://localhost/src/breach-3d.ts'),
   node(6,1,'(idle)'),
   node(7,2,'renderBufferDirect','/node_modules/three/build/three.module.js')
  ],
  samples:[3,4,5,6,7],
  timeDeltas:[3000,5000,4000,8000,10000]
 };
 const summary=summarizeColdCpuProfile(sample);
 assert.equal(summary.sampleCount,5);
 assert.equal(summary.unmappedSamples,0);
 assert.equal(summary.profileWallMs,30);
 assert.equal(summary.sampledIntervalMs,30);
 assert.equal(summary.approximateBuckets['scene-traversal'].approxMs,3);
 assert.equal(summary.approximateBuckets['program-material'].approxMs,5);
 assert.equal(summary.approximateBuckets['game-scene'].approxMs,4);
 assert.equal(summary.approximateBuckets['idle'].approxMs,8);
 assert.equal(summary.approximateBuckets['draw-dispatch'].approxMs,10);
 assert.equal(summary.topExclusiveSampleFrames[0].function,'renderBufferDirect');
 assert.equal(summary.topExclusiveSampleFrames[0].approxMs,10);
 assert.equal(summary.topExclusiveSampleFrames[0].source,
  '/node_modules/three/build/three.module.js');
 assert.match(summary.warning,/not GPU execution/);
});

test('E6.9 summary rejects empty or corrupt Chrome profiles',()=>{
 assert.throws(()=>summarizeColdCpuProfile(null),/missing samples/);
 assert.throws(()=>summarizeColdCpuProfile({nodes:[],samples:[],timeDeltas:[]}),
  /missing samples/);
 assert.throws(()=>summarizeColdCpuProfile({
  nodes:[],samples:[1],timeDeltas:[]}),/missing samples/);
});

test('E6.9 profiles only the real first frame and does not alter production policy',()=>{
 const quick=src('src/breach-quickplay-controller.ts');
 const script=src('scripts/verification/e6-9-cold-cpu-browser.mjs');
 assert.match(quick,/get\('cpuTrace'\)==='1'/);
 assert.match(quick,/if\\(cpuTraceEnabled\\)cdpProfileConsole\\.profile\\?\\.\\('fieldwork-e6\\.9-first-frame'\\)/);
 assert.match(quick,/finally\\{[\\s\\S]*?if\\(cpuTraceEnabled\\)cdpProfileConsole\\.profileEnd\\?\\.\\('fieldwork-e6\\.9-first-frame'\\)/);
 assert.match(quick,/if\(coldTrace\)coldTrace\.capture\('firstFrame'/);
 assert.match(quick,/else config\.renderFirstFrame\(\)/);
 assert.match(script,/Profiler\.consoleProfileFinished/);
 assert.match(script,/newCDPSession/);
 assert.match(script,/\[23,97\]/);
 assert.match(script,/\['1','0'\]/);
 assert.doesNotMatch(quick,/renderer\.shadowMap\.enabled=false/);
 assert.doesNotMatch(quick,/renderer\.setPixelRatio\(/);
});
