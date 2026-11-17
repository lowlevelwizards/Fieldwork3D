import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LiveMainPassProfiler} from '../src/rendering/breach-live-main-pass-profiler.ts';
import {LiveShadowSubmitProfiler} from '../src/rendering/breach-live-shadow-submit-profiler.ts';
import {PostReadyRuntimeCapture} from '../src/rendering/breach-post-ready-attribution.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('E6.19 measures transparent facade and camera-cutaway causes independently',()=>{
 let clock=0;
 const renderer={info:{autoReset:false,render:{calls:0}},
  shadowMap:{render(){renderer.renderBufferDirect(null,null,null,
   {id:1,type:'Depth'},{});}},
  renderBufferDirect(){renderer.info.render.calls++;clock++;}};
 const shadow=new LiveShadowSubmitProfiler(renderer,()=>clock);
 const profiler=new LiveMainPassProfiler(renderer,()=>shadow.isShadowPass,()=>clock);
 const root={userData:{fieldworkRenderCategory:'environment'}};
 const facade={parent:root,userData:{
  fieldworkDrawFamily:'site-wall-body',
  fieldworkTransparencyCause:'known-facade-foreground'}};
 const cutaway={parent:root,userData:{
  fieldworkDrawFamily:'site-wall-body',
  fieldworkTransparencyCause:'camera-cutaway'}};
 const patina={parent:cutaway,userData:{
  fieldworkDrawFamily:'site-wall-patina',
  fieldworkTransparencyCause:'weather-overlay'}};
 const m={id:2,type:'MeshStandardMaterial',transparent:true,opacity:1,depthWrite:true};
 const fade={id:3,type:'MeshStandardMaterial',transparent:true,opacity:.38,depthWrite:false};
 const weather={id:4,type:'MeshBasicMaterial',transparent:true,opacity:.2,depthWrite:false};
 const opaque={id:5,type:'MeshToonMaterial',transparent:false};
 profiler.capture(()=>shadow.capture(()=>{
  renderer.shadowMap.render();
  for(let i=0;i<3;i++)renderer.renderBufferDirect(null,null,null,m,facade);
  for(let i=0;i<2;i++)renderer.renderBufferDirect(null,null,null,fade,cutaway);
  renderer.renderBufferDirect(null,null,null,weather,patina);
  renderer.renderBufferDirect(null,null,null,opaque,root);
 }));
 assert.equal(profiler.last.drawCalls,7);
 assert.equal(profiler.last.transparentDraws,6);
 assert.equal(shadow.last.nonShadowDrawCalls,7);
 assert.deepEqual(profiler.last.transparentFamilies,[
  {family:'known-facade-foreground/site-wall-body/MeshStandardMaterial/full-opacity/writes-depth',draws:3},
  {family:'camera-cutaway/site-wall-body/MeshStandardMaterial/blended/no-depth-write',draws:2},
  {family:'weather-overlay/site-wall-patina/MeshBasicMaterial/blended/no-depth-write',draws:1}
 ]);
 assert.equal(m.opacity,1);
 assert.equal(m.transparent,true);
 assert.equal(m.depthWrite,true);
});

test('E6.19 aggregates transparent family totals without modifying draw reconciliation',()=>{
 const capture=new PostReadyRuntimeCapture(2);
 const sample={renderBufferCalls:2,drawCalls:2,uniqueMaterials:1,
  opaqueDraws:0,transparentDraws:2,alphaTestDraws:0,
  instancedDraws:0,skinnedDraws:0,wallMs:1,reliable:true,
  materialTypes:[{type:'MeshStandardMaterial',draws:2}],
  ownerDraws:[{owner:'environment',draws:2}],
  sourceDraws:[{source:'environment/site-wall-body/BoxGeometry/MeshStandardMaterial/transparent',draws:2}],
  transparentFamilies:[{family:'known-facade-foreground/site-wall-body/MeshStandardMaterial/full-opacity/writes-depth',draws:2}],
  topMaterials:[{id:'2',label:'Wall',type:'MeshStandardMaterial',draws:2,wallMs:1}]};
 const shadow={totalWallMs:2,shadowRenderWallMs:1,nonShadowWallMs:1,
  shadowMapRenderInvocations:1,shadowDrawCalls:1,nonShadowDrawCalls:2,
  totalDrawCalls:3,drawCountsReliable:true};
 const mk=at=>({at,gapMs:16,callbackMs:8,simMs:2,recordingMs:0,
  uiMs:0,sceneMs:6,canvasMs:0,postMs:0,diagnosticsMs:0,
  mode:'live',viewMode:'iso',submitted3D:true,
  sceneBreakdown:{environment:0,camera:0,disclosure:0,actors:2,
   effects:0,fog:0,shadows:0,postCamera:0,gpuSubmit:3},
  mainPassSubmission:sample,shadowSubmission:shadow});
 capture.add(mk(0));capture.add(mk(16));
 const result=capture.finish().sceneAttribution.mainPassAttribution;
 assert.equal(result.frames,2);
 assert.equal(result.reconciledWithNonShadowFrames,2);
 assert.equal(result.transparentDrawsP95,2);
 assert.deepEqual(result.dominantTransparentFamilies,[{
  family:'known-facade-foreground/site-wall-body/MeshStandardMaterial/full-opacity/writes-depth',
  observedDraws:4}]);
});

test('E6.19 records stable wall, glass, patina and fog causes without changing render policy',()=>{
 const site=read('src/rendering/breach-site-scene-builder.ts');
 const openings=read('src/rendering/breach-site-openings-builder.ts');
 const scene=read('src/breach-3d.ts');
 for(const family of ['site-wall-body','site-wall-skirting','site-wall-cap',
   'site-wall-patina','room-patina','site-roof-slab','facade-opening-trim'])
  assert.ok(site.includes("fieldworkDrawFamily='"+family+"'"),family);
 assert.match(openings,/fieldworkDrawFamily='site-window-glass'/);
 assert.match(scene,/fieldworkTransparencyCause=translucent\?/);
 assert.match(scene,/const surfaceTransparent=translucent\|\|knownFacade/);
 const profiler=read('src/rendering/breach-live-main-pass-profiler.ts');
 assert.doesNotMatch(profiler,/readPixels\(|requestAnimationFrame\(|\.flush\(/);
});
