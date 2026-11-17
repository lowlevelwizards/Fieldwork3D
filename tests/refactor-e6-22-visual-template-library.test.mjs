import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {StaticVisualTemplateLibrary}
 from '../src/rendering/fieldwork-visual-template-library.ts';
import {releaseSiteSceneObjects} from '../src/rendering/site-scene-lifecycle.ts';

function builder(material){
 const group=new THREE.Group();
 const geometries=[];
 for(const x of [-4,4]){
  const geometry=new THREE.BoxGeometry(2,3,1);
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.x=x;group.add(mesh);geometries.push(geometry);
 }
 return {root:group,ownedGeometries:geometries};
}
test('E6.22 reuses versioned compiled geometry while keeping per-instance transforms',()=>{
 const cache=new StaticVisualTemplateLibrary();
 const mat=new THREE.MeshStandardMaterial();
 let builds=0;
 const factory=()=>{builds++;return builder(mat);};
 const first=cache.acquire('window:v1:standard',factory,{compile:true});
 const second=cache.acquire('window:v1:standard',factory,{compile:true});
 assert.equal(builds,1);
 assert.equal(cache.stats().builds,1);
 assert.equal(cache.stats().hits,1);
 assert.equal(first.root.children.length,1);
 assert.notEqual(first.root,second.root);
 const a=first.root.children[0],b=second.root.children[0];
 assert.ok(a instanceof THREE.Mesh);
 assert.equal(a.geometry,b.geometry);
 first.root.position.x=100;
 second.root.position.x=-100;
 assert.notEqual(first.root.position.x,second.root.position.x);
 first.release();first.release();
 assert.equal(cache.stats().leases,1);
 second.release();
 cache.clear();
 assert.equal(cache.stats().geometries,0);
 mat.dispose();
});
test('E6.22 invalidation defers all owned geometry destruction until last live lease',()=>{
 const cache=new StaticVisualTemplateLibrary();
 const material=new THREE.MeshStandardMaterial();
 let disposeCount=0,buildCount=0;
 const factory=()=>{
  buildCount++;
  const result=builder(material);
  for(const g of result.ownedGeometries)
   g.addEventListener('dispose',()=>disposeCount++);
  return result;
 };
 const a=cache.acquire('door:v5:wide',factory);
 const b=cache.acquire('door:v5:wide',factory);
 assert.equal(cache.stats().geometries,2);
 assert.equal(cache.invalidate('door:v5:wide'),true);
 assert.equal(cache.stats().templates,0);
 assert.equal(cache.stats().retired,1);
 assert.equal(disposeCount,0);
 const c=cache.acquire('door:v5:wide',factory);
 assert.equal(buildCount,2);
 a.release();assert.equal(disposeCount,0);
 b.release();assert.equal(disposeCount,2);
 c.release();cache.clear();
 assert.equal(disposeCount,4);
 material.dispose();
});
test('E6.22 material resolver isolates Studio edits without cloning geometry',()=>{
 const cache=new StaticVisualTemplateLibrary();
 const palette=new THREE.MeshStandardMaterial({color:0x777777});
 const alternate=new THREE.MeshStandardMaterial({color:0xffffff});
 const base=cache.acquire('helmet:v1:rigid',()=>builder(palette));
 const studio=cache.acquire('helmet:v1:rigid',()=>builder(palette),{
  resolveMaterial:()=>alternate
 });
 assert.equal(studio.root.children[0].geometry,base.root.children[0].geometry);
 assert.equal(studio.root.children[0].material,alternate);
 assert.equal(base.root.children[0].material,palette);
 base.release();studio.release();cache.clear();
 palette.dispose();alternate.dispose();
});
test('E6.22 shared geometry survives site graph release until explicit lease release',()=>{
 const cache=new StaticVisualTemplateLibrary();
 const material=new THREE.MeshStandardMaterial();
 let disposed=0;
 const lease=cache.acquire('cabinet:v1',()=>{
  const result=builder(material);
  for(const geometry of result.ownedGeometries)
   geometry.addEventListener('dispose',()=>disposed++);
  return result;
 });
 const site=new THREE.Group();
 site.add(lease.root);
 releaseSiteSceneObjects(site,new Set(),cache.sharedGeometries());
 assert.equal(disposed,0);
 assert.equal(site.children.length,0);
 lease.release();
 cache.clear();
 assert.equal(disposed,2);
 material.dispose();
});
test('E6.22 rejects articulated template builders and incompatible compiler key modes',()=>{
 const cache=new StaticVisualTemplateLibrary();
 const mat=new THREE.MeshStandardMaterial();
 const invalid=()=>{
  const root=new THREE.Group();
  root.add(new THREE.SkinnedMesh(new THREE.BoxGeometry(1,1,1),mat));
  return {root,ownedGeometries:[]};
 };
 assert.throws(()=>cache.acquire('rig:v1',invalid),/Only rigid/);
 const a=cache.acquire('box:v1',()=>builder(mat));
 assert.throws(()=>cache.acquire('box:v1',()=>builder(mat),{compile:true}),
  /compiler version/);
 a.release();cache.clear();mat.dispose();
});
