import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ColdRendererTrace,COLD_GL_METHODS}
 from '../src/rendering/breach-cold-renderer-trace.ts';

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('E6.8 measures real wrapped GL calls per startup phase and restores owners',async()=>{
 let clock=0,resources={programs:0,geometries:0,textures:0};
 const gl={
  createShader:()=>{clock+=3;return {id:1};},
  compileShader:()=>{clock+=7;},
  createProgram:()=>{clock+=2;return {id:2};},
  linkProgram:()=>{clock+=5;},
  getProgramParameter:()=>{clock+=12;return true;},
  bufferData:()=>{clock+=4;},
  texImage2D:()=>{clock+=6;},
  drawElements:()=>{clock+=8;},
 };
 const originalCompile=gl.compileShader,originalDraw=gl.drawElements;
 const trace=new ColdRendererTrace(gl,43,()=>({...resources}),()=>clock);
 assert.equal(trace.rendererConstructorMs,43);
 assert.ok(trace.installedHooks.includes('compileShader'));
 assert.ok(trace.skippedHooks.includes('drawArrays'));
 await trace.captureAsync('compileAsync',async()=>{
  gl.createShader();gl.compileShader();gl.createProgram();gl.linkProgram();
  gl.getProgramParameter();
  resources={...resources,programs:1};
  await Promise.resolve();
  gl.getProgramParameter();
 });
 trace.capture('firstFrame',()=>{
  gl.bufferData();gl.texImage2D();gl.drawElements();
  resources={programs:1,geometries:9,textures:3};
 });
 const evidence=trace.finish();
 assert.equal(evidence.schema,'fieldwork-e6.8-cold-renderer-v1');
 assert.equal(evidence.captures.length,2);
 assert.equal(evidence.captures[0].calls.compileShader.cpuWallMs,7);
 assert.equal(evidence.captures[0].calls.linkProgram.cpuWallMs,5);
 assert.equal(evidence.captures[0].calls.getProgramParameter.count,2);
 assert.equal(evidence.captures[0].calls.getProgramParameter.cpuWallMs,24);
 assert.equal(evidence.captures[0].resourcesBefore.programs,0);
 assert.equal(evidence.captures[0].resourcesAfter.programs,1);
 assert.equal(evidence.captures[1].calls.bufferData.count,1);
 assert.equal(evidence.captures[1].calls.texImage2D.cpuWallMs,6);
 assert.equal(evidence.captures[1].calls.drawElements.cpuWallMs,8);
 assert.equal(evidence.captures[1].resourcesAfter.geometries,9);
 assert.equal(gl.compileShader,originalCompile);
 assert.equal(gl.drawElements,originalDraw);
 assert.equal(trace.closed,true);
 assert.deepEqual(trace.finish(),evidence);
 assert.throws(()=>trace.capture('firstFrame',()=>{}),/finalized/);
});

test('E6.8 restores hooks on errors and never changes GL arguments or return values',()=>{
 let now=0,seen;
 const original=(...args)=>{seen=args;now+=2;return 37;};
 const gl={linkProgram:original};
 const trace=new ColdRendererTrace(gl,3,()=>({
  programs:0,geometries:0,textures:0
 }),()=>now);
 assert.equal(trace.capture('firstFrame',()=>gl.linkProgram('one',5)),37);
 assert.deepEqual(seen,['one',5]);
 assert.throws(()=>trace.capture('firstFrame',()=>{
  throw new Error('first draw failed');
 }),/first draw failed/);
 const evidence=trace.finish();
 assert.equal(evidence.captures.length,2);
 assert.equal(evidence.captures[1].wallMs,0);
 assert.equal(gl.linkProgram,original);
 assert.equal(COLD_GL_METHODS.includes('finish'),false);
 assert.equal(COLD_GL_METHODS.includes('readPixels'),false);
 assert.equal(COLD_GL_METHODS.includes('getError'),false);
});

test('E6.8 integration is strictly opt-in, cold-only and leaves warmup fallback',()=>{
 const scene=src('src/breach-3d.ts');
 const quick=src('src/breach-quickplay-controller.ts');
 const trace=src('src/rendering/breach-cold-renderer-trace.ts');
 assert.match(scene,/get\('gpuTrace'\)==='1'/);
 assert.match(scene,/this\.coldRendererTrace=coldTraceEnabled\?/);
 assert.match(scene,/rendererStarted=coldTraceEnabled\?performance\.now\(\):0/);
 assert.match(quick,/!stage\.coldRendererTrace\.closed/);
 assert.match(quick,/captureAsync\('compileAsync'/);
 assert.match(quick,/capture\('firstFrame'/);
 assert.match(quick,/const coldRendererEvidence=coldTrace\?\.finish\(\)/);
 assert.match(quick,/\[E6\.8 cold renderer\]/);
 assert.match(quick,/Quick Play shader preparation fallback/);
 assert.match(quick,/config\.boot\.gpuWarmupEnabled/);
 assert.doesNotMatch(trace,/\.getError\(|\.finish\(|\.readPixels\(/);
 assert.doesNotMatch(quick,/renderer\.setPixelRatio\(|shadowMap\.enabled=false/);
});
