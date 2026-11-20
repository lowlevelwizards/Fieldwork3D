import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M9_APPEARANCE_REFERENCES,M9_ART,m9ArtSockets,
 buildM9Appearance,clearM9Appearance}
 from '../src/weapons/geometry/beretta-m9-silhouettes.ts';
import {buildGlockAppearance,clearGlockAppearance}
 from '../src/weapons/geometry/glock-family-silhouettes.ts';
import {SIDEARM_PREVIEW_REFERENCES,buildSidearmPreview,
 clearSidearmPreview} from '../src/weapons/geometry/sidearm-preview.ts';
import {readFileSync} from 'node:fs';

const bounds=g=>new THREE.Box3().setFromObject(g);
const count=g=>{
 let meshes=0,triangles=0;
 g.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;
  meshes++;triangles+=(o.geometry.index?.count??
   o.geometry.attributes.position.count)/3;
 });
 return {meshes,triangles};
};
const sideRay=(g,x,y)=>{
 const ray=new THREE.Raycaster(new THREE.Vector3(x,y,9),
  new THREE.Vector3(0,0,-1),0,20);
 return ray.intersectObject(g,true).length;
};

test('M9 family: two genuinely 3D art-only models, not issued Glock IDs',()=>{
 assert.equal(M9_APPEARANCE_REFERENCES.length,2);
 assert.equal(SIDEARM_PREVIEW_REFERENCES.length,6);
 assert.ok(!M9_APPEARANCE_REFERENCES.some(r=>r.id.startsWith('glock')));
 const source=readFileSync(new URL('../src/secondary-equipment.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/beretta-m9/);
 for(const ref of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(ref.id);
  try{
   assert.equal(m.userData.appearanceOnly,true);
   assert.equal(m.userData.m9Appearance,ref.id);
   assert.equal(m.children.filter(x=>x.userData.m9MovingSlide).length,1);
   assert.equal(m.children.filter(x=>x.userData.m9ExposedBarrel).length,1);
   assert.equal(m.children.filter(x=>x.userData.m9OpenSlideRail).length,2);
   assert.equal(m.children.filter(x=>x.userData.m9OpenGuard).length,1);
   assert.equal(m.children.filter(x=>x.userData.m9Hammer).length,1);
   assert.equal(m.children.filter(x=>x.userData.m9MagazineFloorplate).length,1);
   assert.ok(m.children.every(x=>x.name.startsWith('family-')));
   assert.ok(count(m).meshes<=18,'intentional miniature mesh economy');
   assert.ok(count(m).triangles<=420,'real emitted triangle budget');
  }finally{
   clearM9Appearance(m);
   assert.equal(m.children.length,0);
  }
 }
});

test('M9 negative spaces: guard truly open and forward upper unroofed',()=>{
 for(const ref of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(ref.id,{monochrome:true});
  try{
   assert.equal(sideRay(m,-.3,-2.4),0,'physical aperture');
   assert.ok(sideRay(m,1.45,-2.55)>0,'front pillar');
   assert.ok(sideRay(m,-.4,-3.52)>0,'lower guard');
   assert.equal(sideRay(m,4.4,3.42),0,
    'upper does not have a fictitious full-width roof');
   assert.ok(sideRay(m,-5.0,2.4)>0,'rear slide solid');
   const frame=m.children.find(x=>x.userData.m9IntegratedFrame);
   const slide=m.children.find(x=>x.userData.m9MovingSlide);
   assert.ok(bounds(frame).intersectsBox(bounds(slide)));
   const b=bounds(m),depth=b.max.z-b.min.z;
   assert.ok(depth>=3.0&&depth<=3.4,'substantial but restrained Beretta upper');
  }finally{clearM9Appearance(m);}
 }
});

test('M9A3 silhouette differs through real shape, not FDE only',()=>{
 const m9=buildM9Appearance('beretta-m9');
 const a3=buildM9Appearance('beretta-m9a3');
 const glock=buildGlockAppearance('glock-g19-gen3');
 try{
  const a=bounds(m9),b=bounds(a3),g=bounds(glock);
  assert.ok(a.max.x>g.max.x+.7,'M9 longer than reference Glock');
  assert.ok(b.max.x>a.max.x+.45,'A3 muzzle length is real geometry');
  assert.ok(b.max.y<=a.max.y+.1);
  assert.ok(M9_ART['beretta-m9a3'].straightGrip);
  assert.ok(!M9_ART['beretta-m9'].straightGrip);
  assert.equal(m9.children.filter(x=>x.userData.m9AccessoryRail).length,0);
  assert.equal(a3.children.filter(x=>x.userData.m9AccessoryRail).length,1);
  assert.ok(m9ArtSockets('beretta-m9a3').muzzle.x>
   m9ArtSockets('beretta-m9').muzzle.x);
  assert.equal(m9.userData.m9ArtLandmarks.actualOpenTop,true);
 }finally{
  clearM9Appearance(m9);clearM9Appearance(a3);clearGlockAppearance(glock);
 }
});

test('shared preview accepts Beretta but leaves Glock equipment unchanged',()=>{
 for(const ref of SIDEARM_PREVIEW_REFERENCES){
  const preview=buildSidearmPreview(ref.id,{monochrome:true});
  assert.equal(preview.userData.appearanceOnly,true);
  clearSidearmPreview(ref.id,preview);
  assert.equal(preview.children.length,0);
 }
 const gallery=readFileSync(new URL('../src/arsenal/glock-gallery.ts',import.meta.url),'utf8');
 assert.match(gallery,/buildSidearmPreview/);
 assert.match(gallery,/openM9Inspector/);
 assert.match(gallery,/BERETTA/);
 assert.doesNotMatch(gallery,/equipFreshSecondary/);
});

test('C1 caricature: the exposed round barrel is a real visible object, not a painted beam',()=>{
 for(const {id} of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(id);
  try{
   const barrels=m.children.filter(x=>x.userData.m9ExposedBarrel);
   const sideRails=m.children.filter(x=>x.userData.m9OpenSlideRail);
   assert.equal(barrels.length,1);
   assert.equal(sideRails.length,2);
   const barrel=bounds(barrels[0]);
   const rail=bounds(sideRails[0]);
   assert.ok(barrel.max.y>rail.max.y+.9,
    'barrel protrudes substantially above low side rails');
   assert.ok(barrel.max.y-barrel.min.y>1.2,
    'barrel diameter remains visibly chunky');
   assert.ok(sideRay(m,4.4,2.8)>0,'barrel physically visible from side');
   assert.equal(sideRay(m,4.4,3.42),0,'real opening above barrel');
   assert.ok(m.children.some(x=>x.userData.m9MuzzleCrown));
   const frame=m.children.find(x=>x.userData.m9IntegratedFrame);
   assert.ok(bounds(frame).max.x<M9_ART[id].nose-1.1,
    'shorter dust cover exposes muzzle and no full-length lower slab');
  }finally{clearM9Appearance(m);}
 }
});

test('C1 caricature: grip is swept and broad; classic curvature differs from Vertec',()=>{
 const classic=M9_ART['beretta-m9'],a3=M9_ART['beretta-m9a3'];
 assert.ok(classic.gripRear<a3.gripRear-.5,'classic heel extends rearward');
 assert.ok(classic.gripFront<a3.gripFront-.1,'fuller classic heel');
 for(const {id} of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(id);
  try{
   const panels=m.children.filter(x=>x.userData.m9GripPanel);
   assert.equal(panels.length,2);
   assert.ok(panels.every(p=>bounds(p).max.y<-3.1),
    'grip panels should not become floating slide controls');
   assert.ok(m.children.filter(x=>x.userData.m9DecockerCue).length===2,
    'both exposed slide faces have one deliberate paddle each');
   assert.ok(sideRay(m,-.3,-2.30)===0,
    'larger sculpted trigger guard remains physically empty');
  }finally{clearM9Appearance(m);}
 }
});

test('C2 Beretta inspector is mobile-first and scoped away from Glock loadouts',()=>{
 const inspector=readFileSync(new URL('../src/arsenal/m9-inspector.ts',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/arsenal/arsenal.css',import.meta.url),'utf8');
 assert.match(inspector,/arsenal-m9-inspector/);
 assert.match(inspector,/aria-pressed/);
 assert.match(inspector,/VISUAL STUDY ONLY/);
 assert.match(inspector,/viewport\.top\(\)/);
 assert.match(inspector,/viewport\.useTightArtFraming\(\)/);
 assert.match(inspector,/viewport\.quarter\(\)/);
 assert.doesNotMatch(inspector,/equipFreshSecondary|secondaryRoundTotal|saveGlockLibrary/);
 assert.match(css,/\.arsenal-m9-inspector \.arsenal-wb-main/);
 assert.match(css,/\.arsenal-m9-inspector \.glock-wb-viewport\{height:100%\}/);
});
