import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {generateSite} from '../src/breach-site.ts';
import {buildSiteExterior} from '../src/rendering/breach-site-exterior-builder.ts';
function host(){
 const root=new THREE.Group(),materials=[];
 const solid=(hex)=>new THREE.MeshStandardMaterial({color:hex});
 const box=(parent,x,y,z,w,h,d,material)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 };
 const plane=(parent,x,z,w,d,y,material)=>{
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,d),material);
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 };
 return {root,materials,build:{
  root,solid,box,plane,overlay:()=>new THREE.MeshBasicMaterial(),
  track:m=>{materials.push(m);return m;},age:hex=>hex
 }};
}
test('generated exterior uses site-owned meshes and no simulation collision mutation',()=>{
 const site=generateSite(19,'small');
 const instance=host(),cover=structuredClone(site.cover);
 const walls=structuredClone(site.walls);
 buildSiteExterior(site,instance.build);
 assert.ok(instance.root.children.length>0);
 assert.deepEqual(site.cover,cover);
 assert.deepEqual(site.walls,walls);
});
test('canopy and awning materials are tracked for disposal on site transition',()=>{
 const site=generateSite(7,'small');
 site.structures=[...(site.structures??[]),{
  id:'TEST-CANOPY',kind:'entry-canopy',x:200,y:200,w:60,h:40
 }];
 const instance=host();
 buildSiteExterior(site,instance.build);
 assert.ok(instance.materials.some(m=>m instanceof THREE.MeshBasicMaterial&&
  m.opacity===.16),'canopy material should be registered');
 assert.ok(instance.materials.some(m=>m instanceof THREE.MeshStandardMaterial&&
  m.opacity===.33),'awning material should be registered');
});
