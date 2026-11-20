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
   assert.ok(depth>=3.07,'substantial 3D upper');
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
