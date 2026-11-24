import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LiveMainPassProfiler} from '../src/rendering/breach-live-main-pass-profiler.ts';
import {LiveShadowSubmitProfiler} from '../src/rendering/breach-live-shadow-submit-profiler.ts';
import {PostReadyRuntimeCapture} from '../src/rendering/breach-post-ready-attribution.ts';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('E6.19 classifies only real transparent non-shadow submissions by closest visual reason',()=>{
 let tick=0;
 const renderer={info:{render:{calls:0}},shadowMap:{
  render(){renderer.renderBufferDirect(null,null,null,
   {id:1,type:'DepthMaterial',transparent:true},{userData:{fieldworkTransparencyRole:'shadow-only'}})}
 },renderBufferDirect(){renderer.info.render.calls++;tick++;}};
 const shadow=new LiveShadowSubmitProfiler(renderer,()=>tick);
 const main=new LiveMainPassProfiler(renderer,()=>shadow.isShadowPass,()=>tick);
 const wall={userData:{fieldworkRenderCategory:'environment',
  fieldworkTransparencyRole:'known-exterior-wall'}};
 const weather={parent:wall,userData:{fieldworkTransparencyRole:'wall-weathering'}};
 const decor={parent:wall,userData:{fieldworkDrawFamily:'decor'}};
 const transparent={id:2,type:'MeshStandardMaterial',transparent:true};
 const solid={id:3,type:'MeshStandardMaterial',transparent:false};
 main.capture(()=>shadow.capture(()=>{
  renderer.shadowMap.render();
  renderer.renderBufferDirect(null,null,null,transparent,weather);
  renderer.renderBufferDirect(null,null,null,transparent,decor);
  renderer.renderBufferDirect(null,null,null,solid,wall);
  renderer.renderBufferDirect(null,null,null,transparent,{});
 }));
 assert.equal(main.last.drawCalls,4);
 assert.equal(main.last.transparentDraws,3);
 assert.deepEqual(main.last.transparentRoles,[
  {role:'known-exterior-wall',draws:1},
  {role:'unclassified',draws:1},
  {role:'wall-weathering',draws:1}
 ]);
 assert.equal(main.last.transparentRoles.reduce((s,x)=>s+x.draws,0),
  main.last.transparentDraws);
 assert.equal(shadow.last.shadowDrawCalls,1);
});

test('E6.19 role counts reset, no opaque-only tags leak into transparent telemetry',()=>{
 const renderer={info:{render:{calls:0}},renderBufferDirect(){
  renderer.info.render.calls++;
 }};
 const p=new LiveMainPassProfiler(renderer,()=>false,()=>0);
 const tagged={userData:{fieldworkTransparencyRole:'roof'}};
 p.capture(()=>renderer.renderBufferDirect(null,null,null,
  {type:'MeshStandardMaterial',transparent:true},tagged));
 assert.deepEqual(p.last.transparentRoles,[{role:'roof',draws:1}]);
 p.capture(()=>renderer.renderBufferDirect(null,null,null,
  {type:'MeshStandardMaterial'},tagged));
 assert.deepEqual(p.last.transparentRoles,[]);
 assert.equal(p.last.transparentDraws,0);
});

test('E6.19 bounded capture has exhaustive transparent role reconciliation',()=>{
 const frame={at:1,gapMs:16,callbackMs:8,simMs:2,recordingMs:0,
  uiMs:0,sceneMs:6,canvasMs:0,postMs:0,diagnosticsMs:0,
  mode:'live',viewMode:'iso',submitted3D:true,
  sceneBreakdown:{environment:0,camera:0,disclosure:0,actors:2,
   effects:0,fog:0,shadows:0,postCamera:0,gpuSubmit:3},
  mainPassSubmission:{renderBufferCalls:5,drawCalls:5,uniqueMaterials:2,
   opaqueDraws:2,transparentDraws:3,alphaTestDraws:0,
   instancedDraws:0,skinnedDraws:0,wallMs:4,reliable:true,
   materialTypes:[{type:'MeshStandardMaterial',draws:5}],
   ownerDraws:[{owner:'environment',draws:5}],
   sourceDraws:[{source:'environment/wall',draws:5}],
   transparentRoles:[{role:'known-exterior-wall',draws:2},
    {role:'unclassified',draws:1}],topMaterials:[]},
  shadowSubmission:{totalWallMs:5,shadowRenderWallMs:1,nonShadowWallMs:4,
   shadowMapRenderInvocations:1,shadowDrawCalls:1,nonShadowDrawCalls:5,
   totalDrawCalls:6,drawCountsReliable:true}};
 const capture=new PostReadyRuntimeCapture(3);
 capture.add(frame);capture.add({...frame,at:17});
 const v=capture.finish().sceneAttribution.mainPassAttribution;
 assert.equal(v.transparentRoleReconciledFrames,2);
 assert.equal(v.transparentDrawsTotal,6);
 assert.equal(v.transparentTaggedDrawsTotal,4);
 assert.deepEqual(v.dominantTransparencyRoles,[
  {role:'known-exterior-wall',drawsTotal:4},
  {role:'unclassified',drawsTotal:2}
 ]);
 assert.equal(v.reconciledWithNonShadowFrames,2);
});

test('E6.19 classifications are metadata-only and preserve real cutaway/fog controls',()=>{
 const scene=source('src/rendering/breach-site-scene-builder.ts');
 const loop=source('src/breach-3d.ts');
 const profiler=source('src/rendering/breach-live-main-pass-profiler.ts');
 const wallPolicy=source('src/rendering/breach-wall-presentation.ts');
 assert.match(scene,/fieldworkTransparencyRole='wall-weathering'/);
 assert.match(scene,/fieldworkTransparencyRole='room-roof'/);
 assert.match(scene,/fieldworkTransparencyRole='room-floor-weathering'/);
 assert.match(wallPolicy,/translucent\?'camera-wall-cutaway':'known-exterior-wall'/);
 assert.match(wallPolicy,/renderOrder:surfaceTransparent\?1001:0/);
 assert.match(loop,/mesh\.renderOrder=state\.renderOrder/);
 assert.match(scene,/node\.renderOrder=1002/);
 assert.doesNotMatch(profiler,/readPixels\(|\.flush\(|requestAnimationFrame\(/);
 assert.match(loop,/this\.liveMainPassProfiler=this\.liveShadowSubmitProfiler\?/);
});
