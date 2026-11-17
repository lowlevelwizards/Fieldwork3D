import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LiveMainPassProfiler} from '../src/rendering/breach-live-main-pass-profiler.ts';
import {LiveShadowSubmitProfiler} from '../src/rendering/breach-live-shadow-submit-profiler.ts';
import {PostReadyRuntimeCapture} from '../src/rendering/breach-post-ready-attribution.ts';

test('E6.18a groups only real nonshadow draws by named mesh provenance and surface',()=>{
 let clock=0;
 const renderer={info:{autoReset:false,render:{calls:0}},shadowMap:{
  render(){renderer.renderBufferDirect(null,null,null,{type:'Depth'},{});}
 },renderBufferDirect(){renderer.info.render.calls++;clock++;return 'draw';}};
 const shadow=new LiveShadowSubmitProfiler(renderer,()=>clock);
 const main=new LiveMainPassProfiler(renderer,()=>shadow.isShadowPass,()=>clock);
 const environment={name:'courtyard',userData:{fieldworkRenderCategory:'environment'}};
 const parent={name:'window trim',parent:environment};
 const opaque={id:10,type:'MeshStandardMaterial',transparent:false};
 const transparent={id:11,type:'MeshBasicMaterial',transparent:true};
 main.capture(()=>shadow.capture(()=>{
  renderer.shadowMap.render();
  renderer.renderBufferDirect(null,null,null,opaque,
   {geometry:{type:'BoxGeometry'},parent});
  renderer.renderBufferDirect(null,null,null,opaque,
   {geometry:{type:'BoxGeometry'},parent});
  renderer.renderBufferDirect(null,null,null,transparent,
   {geometry:{type:'PlaneGeometry'},parent});
 }));
 assert.equal(main.last.drawCalls,3);
 assert.equal(shadow.last.shadowDrawCalls,1);
 assert.deepEqual(main.last.sourceDraws,[
  {source:'environment/window trim/BoxGeometry/MeshStandardMaterial/opaque',draws:2},
  {source:'environment/window trim/PlaneGeometry/MeshBasicMaterial/transparent',draws:1}
 ]);
 assert.equal(main.last.transparentDraws,1);
});

test('E6.18a explicit family tag, unnamed fallback and source resets',()=>{
 const renderer={info:{render:{calls:0}},renderBufferDirect(){
  renderer.info.render.calls++;
 }};
 const profiler=new LiveMainPassProfiler(renderer,()=>false,()=>0);
 const group={name:'site root',userData:{fieldworkRenderCategory:'environment'}};
 const tagged={name:'arbitrary mesh',parent:group,
  userData:{fieldworkDrawFamily:'fixed door frame'},
  geometry:{type:'BufferGeometry'}};
 const unknown={geometry:{type:'BufferGeometry'}};
 const material={id:2,type:'MeshToonMaterial',alphaTest:.25};
 profiler.capture(()=>{
  renderer.renderBufferDirect(null,null,null,material,tagged);
  renderer.renderBufferDirect(null,null,null,material,unknown);
 });
 assert.deepEqual(profiler.last.sourceDraws,[
  {source:'environment/fixed door frame/BufferGeometry/MeshToonMaterial/alpha-test',draws:1},
  {source:'unclassified/[unnamed]/BufferGeometry/MeshToonMaterial/alpha-test',draws:1}
 ]);
 profiler.capture(()=>renderer.renderBufferDirect(null,null,null,material,unknown));
 assert.deepEqual(profiler.last.sourceDraws,[
  {source:'unclassified/[unnamed]/BufferGeometry/MeshToonMaterial/alpha-test',draws:1}
 ]);
});

test('E6.18a bounded 90 callback aggregation observes source families without changing draw reconciliation',()=>{
 const capture=new PostReadyRuntimeCapture(2);
 const sample={renderBufferCalls:3,drawCalls:3,uniqueMaterials:1,
  opaqueDraws:3,transparentDraws:0,alphaTestDraws:0,
  instancedDraws:0,skinnedDraws:0,wallMs:3,reliable:true,
  materialTypes:[{type:'MeshStandardMaterial',draws:3}],
  ownerDraws:[{owner:'environment',draws:3}],
  topMaterials:[{id:'4',label:'Environment',type:'MeshStandardMaterial',draws:3,wallMs:3}],
  sourceDraws:[{source:'environment/fixtures/BoxGeometry/MeshStandardMaterial/opaque',draws:3}]};
 const shadow={totalWallMs:4,shadowRenderWallMs:1,nonShadowWallMs:3,
  shadowMapRenderInvocations:1,shadowDrawCalls:1,nonShadowDrawCalls:3,
  totalDrawCalls:4,drawCountsReliable:true};
 const frame={at:0,gapMs:16,callbackMs:8,simMs:2,recordingMs:0,
  uiMs:0,sceneMs:6,canvasMs:0,postMs:0,diagnosticsMs:0,
  mode:'live',viewMode:'iso',submitted3D:true,
  mainPassSubmission:sample,shadowSubmission:shadow};
 capture.add(frame);capture.add({...frame,at:16});
 const v=capture.finish().sceneAttribution.mainPassAttribution;
 assert.equal(v.frames,2);
 assert.equal(v.reconciledWithNonShadowFrames,2);
 assert.deepEqual(v.dominantSources,[
  {source:'environment/fixtures/BoxGeometry/MeshStandardMaterial/opaque',observedDraws:6}
 ]);
});

test('E6.18a diagnostics remain opt-in and no extra rendering or GL fences are added',()=>{
 const src=readFileSync(new URL('../src/rendering/breach-live-main-pass-profiler.ts',import.meta.url),'utf8');
 assert.doesNotMatch(src,/requestAnimationFrame\(|readPixels\(|\.flush\(|\.finish\(/);
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(scene,/this\.liveMainPassProfiler=this\.liveShadowSubmitProfiler\?/);
});
