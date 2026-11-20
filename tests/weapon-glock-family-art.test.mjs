import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLOCK_APPEARANCE_REFERENCES,buildGlockAppearance,clearGlockAppearance}
 from '../src/weapons/geometry/glock-family-silhouettes.ts';
import {readFileSync} from 'node:fs';
const bounds=g=>new THREE.Box3().setFromObject(g);
const triangleCount=g=>{
 let n=0;
 g.traverse(child=>{
  if(!(child instanceof THREE.Mesh))return;
  const geo=child.geometry;
  n+=(geo.index?.count??geo.attributes.position.count)/3;
 });
 return n;
};
test('Glock G1: all four reference models have purposeful, low-cost native 3D geometry',()=>{
 assert.equal(GLOCK_APPEARANCE_REFERENCES.length,4);
 for(const ref of GLOCK_APPEARANCE_REFERENCES){
  const model=buildGlockAppearance(ref.id);
  try{
   assert.equal(model.userData.appearanceOnly,true);
   assert.ok(model.children.length>=7&&model.children.length<=12,ref.id);
   assert.ok(triangleCount(model)<=300,ref.id+' triangle review budget');
   assert.ok(model.children.every(x=>x.name.startsWith('family-')),ref.id);
   assert.equal(model.children.filter(x=>x.userData.glockOpenGuard).length,1);
   assert.equal(model.children.filter(x=>x.userData.glockMovingSlide).length,1);
   const b=bounds(model);
   assert.ok(b.max.z-b.min.z>=2,'genuine 3D depth');
   assert.ok(b.max.y-b.min.y>=9,'full pistol profile');
  }finally{
   clearGlockAppearance(model);
   assert.equal(model.children.length,0);
  }
 }
});
test('Glock G1: guard opening is physically void, not a painted dark rectangle',()=>{
 const model=buildGlockAppearance('glock-g19-gen3',{monochrome:true});
 try{
  const ray=new THREE.Raycaster(new THREE.Vector3(-.3,-2.45,8),
   new THREE.Vector3(0,0,-1),0,20);
  assert.equal(ray.intersectObject(model,true).length,0,
   'ray through trigger opening must pass freely');
  const rim=new THREE.Raycaster(new THREE.Vector3(.75,-3.72,8),
   new THREE.Vector3(0,0,-1),0,20);
  assert.ok(rim.intersectObject(model,true).length>=1,
   'bottom wall of actual guard must be solid');
 }finally{clearGlockAppearance(model);}
});
test('Glock G1: anatomy and variants change actual geometry rather than arbitrary scale',()=>{
 const g19=buildGlockAppearance('glock-g19-gen3');
 const g26=buildGlockAppearance('glock-g26');
 const g19x=buildGlockAppearance('glock-g19x');
 const gen5=buildGlockAppearance('glock-g19-gen5-mos');
 try{
  const a=bounds(g19),b=bounds(g26),c=bounds(g19x),d=bounds(gen5);
  assert.ok(b.max.x<a.max.x-2,'G26 slide is physically shorter');
  assert.ok(b.min.y>a.min.y+1,'G26 grip physically shorter');
  assert.ok(c.min.y<a.min.y-1,'G19X longer full-size grip');
  assert.ok(Math.abs(d.max.x-a.max.x)<.05,'Gen5 compact keeps master envelope');
  for(const model of [g19,g26,g19x,gen5]){
   const frame=model.children.find(x=>x.name.includes('-receiver-')&&!x.userData.glockOpenGuard);
   const grip=model.children.find(x=>x.userData.glockHandle);
   assert.ok(frame&&grip,'frame and grip exist');
   assert.ok(bounds(frame).intersectsBox(bounds(grip)),
    'grip visibly intersects joined polymer frame');
  }
 }finally{for(const m of [g19,g26,g19x,gen5])clearGlockAppearance(m);}
});
test('Glock G2: Arsenal discovers the shared model preview without claiming live sidearm support',()=>{
 const source=readFileSync(new URL('../src/arsenal/gallery-main.ts',import.meta.url),'utf8');
 const preview=readFileSync(new URL('../src/arsenal/glock-gallery.ts',import.meta.url),'utf8');
 assert.match(source,/mountGlockArsenalGallery/);
 assert.match(preview,/buildGlockAppearance/);
 assert.match(preview,/NOT YET EQUIPPABLE/);
});
