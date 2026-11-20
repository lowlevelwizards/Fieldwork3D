import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLOCK_APPEARANCE_REFERENCES,GLOCK_G2_ART,
 buildGlockAppearance,clearGlockAppearance}
 from '../src/weapons/geometry/glock-family-silhouettes.ts';
import {glockPreviewFitDistance} from '../src/arsenal/glock-gallery.ts';
import {readFileSync} from 'node:fs';

const bounds=o=>new THREE.Box3().setFromObject(o);
const triangleCount=g=>{
 let n=0;
 g.traverse(child=>{
  if(!(child instanceof THREE.Mesh))return;
  const geo=child.geometry;
  n+=(geo.index?.count??geo.attributes.position.count)/3;
 });
 return n;
};
const ray=(g,x,y)=>new THREE.Raycaster(
 new THREE.Vector3(x,y,10),new THREE.Vector3(0,0,-1),0,24)
 .intersectObject(g,true).length;

test('G2: four independently authored chunky pistol family silhouettes in one tiny real mesh budget',()=>{
 assert.equal(GLOCK_APPEARANCE_REFERENCES.length,4);
 for(const ref of GLOCK_APPEARANCE_REFERENCES){
  const model=buildGlockAppearance(ref.id);
  try{
   assert.equal(model.userData.appearanceOnly,true);
   assert.equal(model.userData.glockG2FieldworkProportions,true);
   assert.ok(model.children.length>=6&&model.children.length<=7,ref.id);
   assert.ok(triangleCount(model)<=220,ref.id+' measured emitted triangles');
   assert.ok(model.children.every(x=>x.name.startsWith('family-')));
   assert.equal(model.children.filter(x=>x.userData.glockMovingSlide).length,1);
   assert.equal(model.children.filter(x=>x.userData.glockOpenGuard).length,1);
   assert.equal(model.children.filter(x=>x.userData.glockIntegratedFrameGrip).length,1);
   assert.ok(model.children.every(x=>!x.name.includes('-right-port')),
    'remove distracting standalone right port');
   const b=bounds(model);
   assert.ok(b.max.z-b.min.z>=3.1,'genuinely wide 3D slide');
   assert.ok(b.max.y-b.min.y>=9,'full pistol shape');
  }finally{
   clearGlockAppearance(model);
   assert.equal(model.children.length,0);
  }
 }
});
test('G2: integrated frame, grip and trigger guard surround actual empty space',()=>{
 for(const ref of GLOCK_APPEARANCE_REFERENCES){
  const model=buildGlockAppearance(ref.id,{monochrome:true});
  try{
   assert.equal(ray(model,-.3,-2.48),0,'trigger aperture is physically open');
   assert.ok(ray(model,.4,-3.28)>0,'solid lower guard boundary');
   const frame=model.children.find(x=>x.userData.glockIntegratedFrameGrip);
   const slide=model.children.find(x=>x.userData.glockMovingSlide);
   assert.ok(frame&&slide);
   assert.ok(bounds(frame).intersectsBox(bounds(slide)),
    'frame joins the slide without a floating spacer');
   assert.ok(!model.children.some(x=>x.name.includes('open-guard')),
    'no separate dangling trigger guard slab');
  }finally{clearGlockAppearance(model);}
 }
});
test('G2: slide is heavy, blunt and shorter relative to height than old G1',()=>{
 const model=buildGlockAppearance('glock-g19-gen3',{monochrome:true});
 try{
  const slide=model.children.find(x=>x.userData.glockMovingSlide);
  const frame=model.children.find(x=>x.userData.glockIntegratedFrameGrip);
  const s=bounds(slide),f=bounds(frame);
  const length=s.max.x-s.min.x,height=s.max.y-s.min.y;
  assert.ok(length<=16,'shortened compact upper mass');
  assert.ok(height>=2.85,'thickened slide height');
  assert.ok(length/height<5.7,'no long wafer-thin upper');
  assert.ok(s.max.z-s.min.z>f.max.z-f.min.z,
   'slide remains boldest depth mass');
  const full=bounds(model),overallRatio=
   (full.max.x-full.min.x)/(full.max.y-full.min.y);
  assert.ok(overallRatio<1.50,'stubby overall miniature');
 }finally{clearGlockAppearance(model);}
});
test('G2: G26, G19X and MOS retain variant-specific anatomy, not global scale tricks',()=>{
 const g19=buildGlockAppearance('glock-g19-gen3');
 const g26=buildGlockAppearance('glock-g26');
 const g19x=buildGlockAppearance('glock-g19x');
 const gen5=buildGlockAppearance('glock-g19-gen5-mos');
 try{
  const a=bounds(g19),b=bounds(g26),c=bounds(g19x),d=bounds(gen5);
  assert.ok(b.max.x<a.max.x-2,'G26 nose is intrinsically shorter');
  assert.ok(b.min.y>a.min.y+1.2,'G26 grip genuinely shorter');
  assert.ok(c.min.y<a.min.y-.8,'G19X fuller grip');
  assert.ok(Math.abs(d.max.x-a.max.x)<.05,'Gen5 and Gen3 compact envelopes');
  assert.equal(GLOCK_G2_ART['glock-g26'].frontSerrations,false);
  assert.equal(gen5.children.filter(x=>x.userData.glockMOSAppearanceOnly).length,1);
  assert.equal(g19.children.filter(x=>x.userData.glockMOSAppearanceOnly).length,0);
  for(const model of [g19,g26,g19x,gen5]){
   assert.ok(model.children.some(x=>x.name.includes('serration-batch')));
   assert.ok(model.children.filter(x=>x.userData.glockIntegratedFrameGrip).length===1);
  }
 }finally{for(const m of [g19,g26,g19x,gen5])clearGlockAppearance(m);}
});
test('G2: detail removal saves surfaces without destroying required silhouette features',()=>{
 const base=buildGlockAppearance('glock-g19-gen3',{monochrome:true});
 const detailed=buildGlockAppearance('glock-g19-gen3');
 try{
  assert.equal(base.children.length,5);
  assert.ok(detailed.children.length===base.children.length+1);
  assert.ok(triangleCount(detailed)>triangleCount(base));
  assert.equal(base.userData.glockArtLandmarks.guardOpen,true);
 }finally{clearGlockAppearance(base);clearGlockAppearance(detailed);}
});
test('G2: pistol-specific Arsenal close framing and honest real-MP5K peer mode',()=>{
 const pistol=buildGlockAppearance('glock-g19-gen3');
 try{
  const fit=glockPreviewFitDistance(bounds(pistol),960,480,.86);
  assert.ok(fit<27,'no giant rifle minimum camera distance for handguns');
  assert.ok(fit>=17.5,'still preserves all model bounds');
 }finally{clearGlockAppearance(pistol);}
 const source=readFileSync(new URL('../src/arsenal/gallery-main.ts',import.meta.url),'utf8');
 const preview=readFileSync(new URL('../src/arsenal/glock-gallery.ts',import.meta.url),'utf8');
 assert.match(source,/mountGlockArsenalGallery/);
 assert.match(preview,/buildGlockAppearance/);
 assert.match(preview,/buildWeaponSilhouette/);
 assert.match(preview,/hk-mp5k/);
 assert.match(preview,/provisional until a live sidearm rig exists/);
 assert.match(preview,/NOT YET EQUIPPABLE/);
});
