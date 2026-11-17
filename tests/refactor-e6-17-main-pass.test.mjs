import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LiveMainPassProfiler} from '../src/rendering/breach-live-main-pass-profiler.ts';
import {LiveShadowSubmitProfiler} from '../src/rendering/breach-live-shadow-submit-profiler.ts';
import {PostReadyRuntimeCapture} from '../src/rendering/breach-post-ready-attribution.ts';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const mkFrame=(mainPassSubmission,shadowSubmission)=>({
 at:1,gapMs:16,callbackMs:16,simMs:3,recordingMs:0,uiMs:1,
 sceneMs:10,canvasMs:0,postMs:0,diagnosticsMs:0,mode:'live',
 viewMode:'iso',submitted3D:true,
 sceneBreakdown:{environment:0,camera:0,disclosure:0,actors:2,
 effects:0,fog:1,shadows:0,postCamera:0,gpuSubmit:6},
 mainPassSubmission,shadowSubmission
});
test('E6.17 wraps actual main draw, preserves receiver/args, categories and counts',()=>{
 let clock=0;
 const renderer={info:{render:{calls:0}},shadowMap:{render(){}},
  renderBufferDirect(...args){
   assert.equal(this,renderer);
   assert.equal(args[3].type,'MeshStandardMaterial');
   renderer.info.render.calls+=2;clock+=5;return 'original';
  }};
 const shadow=new LiveShadowSubmitProfiler(renderer,()=>clock);
 const profiler=new LiveMainPassProfiler(renderer,()=>shadow.isShadowPass,()=>clock);
 assert.equal(profiler.installed,true);
 const material={id:11,type:'MeshStandardMaterial',name:'Fixture'};
 const object={isInstancedMesh:true};
 const result=profiler.capture(()=>
  renderer.renderBufferDirect(null,null,null,material,object,null));
 assert.equal(result,'original');
 assert.equal(profiler.last.drawCalls,2);
 assert.equal(profiler.last.opaqueDraws,2);
 assert.equal(profiler.last.instancedDraws,2);
 assert.equal(profiler.last.uniqueMaterials,1);
 assert.equal(profiler.last.wallMs,5);
 assert.deepEqual(profiler.last.materialTypes,[{type:'MeshStandardMaterial',draws:2}]);
 assert.equal(profiler.last.topMaterials[0].label,'Fixture');
});
test('E6.17 excludes shadow draw submissions and handles transparency',()=>{
 let clock=0;
 const renderer={info:{render:{calls:0}},shadowMap:{
  render(){renderer.renderBufferDirect(null,null,null,
    {id:1,type:'ShadowDepth'},{});}},
  renderBufferDirect(){renderer.info.render.calls++;clock++;}
 };
 const shadow=new LiveShadowSubmitProfiler(renderer,()=>clock);
 const main=new LiveMainPassProfiler(renderer,()=>shadow.isShadowPass,()=>clock);
 main.capture(()=>shadow.capture(()=>{
  renderer.shadowMap.render();
  renderer.renderBufferDirect(null,null,null,
   {id:2,type:'MeshBasicMaterial',transparent:true},{});
  renderer.renderBufferDirect(null,null,null,
   {id:3,type:'MeshStandardMaterial',alphaTest:.5},{isSkinnedMesh:true});
 }));
 assert.equal(main.last.drawCalls,2);
 assert.equal(main.last.transparentDraws,1);
 assert.equal(main.last.alphaTestDraws,1);
 assert.equal(main.last.skinnedDraws,1);
 assert.equal(shadow.last.shadowDrawCalls,1);
 assert.equal(shadow.last.nonShadowDrawCalls,2);
});
test('E6.17 never suppresses original thrown render exception',()=>{
 const renderer={info:{render:{calls:0}},renderBufferDirect(){
  throw Error('original render failure');}};
 const main=new LiveMainPassProfiler(renderer,()=>false,()=>0);
 assert.throws(()=>main.capture(()=>renderer.renderBufferDirect(null,null,null,
  {id:1,type:'X'},{})),/original render failure/);
 assert.equal(main.last.reliable,true);
});
test('E6.17 bounded live summary preserves 90-frame counts and no skipped work',()=>{
 const capture=new PostReadyRuntimeCapture(3);
 const sample={renderBufferCalls:4,drawCalls:5,uniqueMaterials:2,
  opaqueDraws:3,transparentDraws:1,alphaTestDraws:1,
  instancedDraws:2,skinnedDraws:1,wallMs:4,reliable:true,
  materialTypes:[{type:'MeshBasicMaterial',draws:5}],
  topMaterials:[{id:'42',label:'Basic',type:'MeshBasicMaterial',
   draws:4,wallMs:2}]};
 const shadow={totalWallMs:6,shadowRenderWallMs:1,nonShadowWallMs:5,
  shadowMapRenderInvocations:1,shadowDrawCalls:1,
  nonShadowDrawCalls:5,totalDrawCalls:6,drawCountsReliable:true};
 capture.add(mkFrame(sample,shadow));
 capture.add(mkFrame(sample,shadow));
 capture.add({...mkFrame(undefined,undefined),submitted3D:false,
  sceneBreakdown:undefined});
 const v=capture.finish().sceneAttribution.mainPassAttribution;
 assert.equal(v.frames,2);assert.equal(v.reliableFrames,2);
 assert.equal(v.drawCallsP95,5);
 assert.equal(v.transparentDrawsP95,1);
 assert.equal(v.reconciledWithNonShadowFrames,2);
 assert.deepEqual(v.dominantMaterialTypes,
  [{type:'MeshBasicMaterial',drawsTotal:10}]);
 assert.equal(v.topMaterialInstances[0].observedDraws,8);
 const absent=new PostReadyRuntimeCapture(1);
 absent.add(mkFrame(undefined,undefined));
 assert.equal(absent.finish().sceneAttribution.mainPassAttribution,null);
});
test('E6.17 default unaffected; no extra RAF, readback or GL flush',()=>{
 const p=src('src/rendering/breach-live-main-pass-profiler.ts');
 assert.doesNotMatch(p,/requestAnimationFrame\(|readPixels\(|\.finish\(|\.flush\(/);
 const scene=src('src/breach-3d.ts');
 assert.match(scene,/this\.liveMainPassProfiler=this\.liveShadowSubmitProfiler\?/);
 assert.match(scene,/this\.liveMainPassProfiler\.capture\(/);
 assert.match(src('src/breach-runtime-loop.ts'),
  /mainPassSubmission:coldStats\?\.mainPassSubmission\?\?undefined/);
});
