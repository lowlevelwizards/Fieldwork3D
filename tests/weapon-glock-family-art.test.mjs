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

test('G2.5: four independently authored balanced miniatures in the existing mesh budget',()=>{
 assert.equal(GLOCK_APPEARANCE_REFERENCES.length,4);
 for(const ref of GLOCK_APPEARANCE_REFERENCES){
  const model=buildGlockAppearance(ref.id);
  try{
   assert.equal(model.userData.appearanceOnly,true);
   assert.equal(model.userData.glockG2FieldworkProportions,true);
   assert.equal(model.userData.glockG25BalancedProportions,true);
   assert.ok(model.children.length>=6&&model.children.length<=7,ref.id);
   assert.ok(triangleCount(model)<=220,ref.id+' measured emitted triangles');
   assert.ok(model.children.every(x=>x.name.startsWith('family-')));
   assert.equal(model.children.filter(x=>x.userData.glockMovingSlide).length,1);
   assert.equal(model.children.filter(x=>x.userData.glockOpenGuard).length,1);
   assert.equal(model.children.filter(x=>x.userData.glockIntegratedFrameGrip).length,1);
   assert.ok(model.children.every(x=>!x.name.includes('-right-port')),
    'remove distracting standalone right port');
   const b=bounds(model);
   assert.ok(b.max.z-b.min.z>=2.95,'substantial but not oversized slide depth');
   assert.ok(b.max.y-b.min.y>=9,'full pistol shape');
   assert.ok(model.children.some(x=>x.userData.glockRightEjectionPort),
    'single batched right-side port exists for detailed models');
  }finally{
   clearGlockAppearance(model);
   assert.equal(model.children.length,0);
  }
 }
});
test('G2.5: thick guard remains connected and aperture stays genuinely open',()=>{
 for(const ref of GLOCK_APPEARANCE_REFERENCES){
  const model=buildGlockAppearance(ref.id,{monochrome:true});
  try{
   assert.equal(ray(model,-.3,-2.48),0,'trigger aperture is physically open');
   assert.ok(ray(model,.4,-3.52)>0,'substantial lower guard bar');
   assert.ok(ray(model,1.35,-2.5)>0,'wide front guard pillar');
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
test('G2.5: slide ratios deliberately interpolate G1 and G2 without returning to either extreme',()=>{
 const model=buildGlockAppearance('glock-g19-gen3',{monochrome:true});
 try{
  const slide=model.children.find(x=>x.userData.glockMovingSlide);
  const frame=model.children.find(x=>x.userData.glockIntegratedFrameGrip);
  const s=bounds(slide),f=bounds(frame);
  const length=s.max.x-s.min.x,height=s.max.y-s.min.y;
  assert.ok(length>=16.7&&length<=17.0,'between G2 15.69 and G1 18.8');
  assert.ok(height>=2.65&&height<=2.75,'between G2 2.90 and G1 2.16');
  assert.ok(length/height>5.7&&length/height<7.5,'balanced Glock mass ratio');
  assert.ok(s.max.z-s.min.z>f.max.z-f.min.z,
   'slide remains boldest depth mass');
  const full=bounds(model),overallRatio=
   (full.max.x-full.min.x)/(full.max.y-full.min.y);
  assert.ok(overallRatio>1.37&&overallRatio<1.65,
   'compact but not exaggerated block overall miniature');
 }finally{clearGlockAppearance(model);}
});
test('G2.5: compact, subcompact, crossover, and MOS retain independently authored anatomy',()=>{
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
test('G2.5: port and serrations share ONE mesh; clay deletes the entire detail layer',()=>{
 const base=buildGlockAppearance('glock-g19-gen3',{monochrome:true});
 const detailed=buildGlockAppearance('glock-g19-gen3');
 try{
  assert.equal(base.children.length,5);
  assert.ok(detailed.children.length===base.children.length+1);
  assert.ok(triangleCount(detailed)>triangleCount(base));
  assert.equal(base.userData.glockArtLandmarks.guardOpen,true);
  assert.equal(base.userData.glockArtLandmarks.rightEjectionPort,false);
  assert.equal(detailed.userData.glockArtLandmarks.rightEjectionPort,true);
 }finally{clearGlockAppearance(base);clearGlockAppearance(detailed);}
});

test('G2.5: right-side ejection port is one flat batched rectangle, not new geometry',()=>{
 for(const ref of GLOCK_APPEARANCE_REFERENCES){
  const g=buildGlockAppearance(ref.id);
  try{
   const detail=g.children.filter(x=>x.userData.glockRightEjectionPort);
   assert.equal(detail.length,1,'existing single surface detail batch');
   const verts=detail[0].geometry.attributes.position;
   // Port is the final 4 vertices intentionally appended to the SAME
   // geometry batch; compare rounded Float32 positions with tolerance.
   const portVerts=Array.from({length:4},(_,n)=>{
    const i=verts.count-4+n;
    return [verts.getX(i),verts.getY(i),verts.getZ(i)];
   });
   assert.equal(portVerts.length,4,'one four-vertex port graphic');
   assert.ok(portVerts.every(v=>v[2]>1.48),'right +Z face only');
   assert.ok(portVerts.every(v=>v[0]>.57&&v[0]<2.54),
    'modest central-right symbolic port width');
   assert.ok(portVerts.every(v=>v[1]>2.05&&v[1]<2.52),
    'ejection port stays within the slide face');
   assert.ok(triangleCount(g)<=220,'no geometry budget increase');
  }finally{clearGlockAppearance(g);}
 }
});
test('G2.5: revised heel and slide positions sit strictly between G1 and G2',()=>{
 const g=buildGlockAppearance('glock-g19-gen3');
 try{
  const a=g.userData.glockArtLandmarks;
  assert.ok(a.rearX< -8.17&&a.rearX> -9.4);
  assert.ok(a.muzzleX>7.52&&a.muzzleX<9.40);
  assert.ok(a.slideTopY<3.24&&a.slideTopY>2.50);
  assert.ok(a.slideDepth<3.15&&a.slideDepth>2.45);
  assert.ok(a.gripHeelY< -7.22&&a.gripHeelY> -8.50);
  assert.ok(a.guardOpeningX[1]<1.76);
  assert.ok(a.guardOpeningY[0]> -3.80);
 }finally{clearGlockAppearance(g);}
});

test('G2.5: pistol-specific Arsenal close framing and honest real-MP5K peer mode',()=>{
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
