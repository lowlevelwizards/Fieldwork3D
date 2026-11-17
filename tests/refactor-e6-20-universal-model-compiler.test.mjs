import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {compileRigidVisualOwner} from '../src/rendering/fieldwork-model-compiler.ts';

function part(owner,material,x,y=0){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,4,1),material);
 mesh.position.set(x,y,0);
 owner.add(mesh);
 return mesh;
}
function boxOf(owner){
 owner.updateMatrixWorld(true);
 const b=new THREE.Box3();
 for(const mesh of owner.children){
  if(!(mesh instanceof THREE.Mesh)||!mesh.visible)continue;
  b.union(new THREE.Box3().setFromObject(mesh));
 }
 return b;
}
test('E6.20 compiles rigid opaque siblings with exact bounds and restore',()=>{
 const root=new THREE.Group();
 root.position.set(12,0,3);root.rotation.y=.6;
 const mat=new THREE.MeshStandardMaterial();
 const a=part(root,mat,-3),b=part(root,mat,3);
 const before=boxOf(root);
 const result=compileRigidVisualOwner(root);
 assert.equal(result.sourceMeshes,2);
 assert.equal(result.compiledMeshes,1);
 assert.equal(result.avoidedDraws,1);
 assert.equal(root.children.filter(x=>x instanceof THREE.Mesh).length,1);
 assert.equal(result.archive.visible,false);
 const after=boxOf(root);
 assert.ok(before.min.distanceTo(after.min)<1e-4);
 assert.ok(before.max.distanceTo(after.max)<1e-4);
 assert.equal(a.parent,result.archive);
 result.restore();result.restore();
 assert.equal(a.parent,root);assert.equal(b.parent,root);
 assert.equal(result.archive.parent,null);
 for(const m of [a,b])m.geometry.dispose();
 mat.dispose();
});
test('E6.20 transparent facade policy keeps glass and independent owners',()=>{
 const facade=new THREE.Group(),interior=new THREE.Group();
 const material=new THREE.MeshStandardMaterial({
  transparent:true,opacity:1,depthWrite:true
 });
 const pane=new THREE.MeshStandardMaterial({
  transparent:true,opacity:.3,depthWrite:false
 });
 for(const x of [-5,0,5]){
  const m=part(facade,material,x);
  m.renderOrder=1002;
  m.userData.fogFacade=true;
  m.userData.fieldworkTransparencyRole='known-exterior-detail';
 }
 const glass=part(facade,pane,12);
 glass.renderOrder=1002;
 glass.userData.fieldworkTransparencyRole='window-glass';
 const other=part(interior,material,22);
 other.renderOrder=1002;other.userData.fogFacade=true;
 other.userData.fieldworkTransparencyRole='known-exterior-detail';
 const result=compileRigidVisualOwner(facade,{mode:'opaque-facade',
  exclude:new Set([glass])});
 assert.equal(result.sourceMeshes,3);
 assert.equal(result.avoidedDraws,2);
 assert.equal(glass.parent,facade);
 assert.equal(other.parent,interior);
 const combined=facade.children.find(x=>x instanceof THREE.Mesh&&
  x.userData.fieldworkCompiledModel);
 assert.equal(combined.material,material);
 assert.equal(combined.renderOrder,1002);
 assert.equal(combined.userData.fieldworkTransparencyRole,'known-exterior-detail');
 result.restore();
 assert.equal(facade.children.filter(x=>x instanceof THREE.Mesh).length,4);
 for(const m of [...facade.children,...interior.children])
  if(m instanceof THREE.Mesh)m.geometry.dispose();
 material.dispose();pane.dispose();
});
test('E6.20 excludes joints, named controls, unknown userData and mixed render contracts',()=>{
 const owner=new THREE.Group();
 const mat=new THREE.MeshStandardMaterial();
 const named=part(owner,mat,1);named.name='hinge';
 const tagged=part(owner,mat,4);tagged.userData.doorState=1;
 const child=part(owner,mat,8);child.add(new THREE.Group());
 const hidden=part(owner,mat,11);hidden.visible=false;
 const differentlyLit=part(owner,mat,14);differentlyLit.castShadow=true;
 const only=part(owner,mat,17);
 const third=part(owner,new THREE.MeshStandardMaterial(),20);
 const result=compileRigidVisualOwner(owner);
 assert.equal(result.avoidedDraws,0);
 assert.equal(result.archive,null);
 assert.equal(owner.children.length,7);
 for(const m of owner.children)if(m instanceof THREE.Mesh){
  m.geometry.dispose();
  if(m.material!==mat)m.material.dispose();
 }
 mat.dispose();
});
test('E6.20 does not merge real translucent, depth-modified or alpha-tested parts',()=>{
 const o=new THREE.Group();
 for(const mat of [
  new THREE.MeshStandardMaterial({transparent:true,opacity:.6}),
  new THREE.MeshStandardMaterial({transparent:true,opacity:1,depthWrite:false}),
  new THREE.MeshStandardMaterial({transparent:true,opacity:1,alphaTest:.5}),
 ]){
  for(const x of [0,4]){
   const m=part(o,mat,x);m.renderOrder=1002;
   m.userData.fieldworkTransparencyRole='known-exterior-detail';
   m.userData.fogFacade=true;
  }
 }
 assert.equal(compileRigidVisualOwner(o,{mode:'opaque-facade'}).avoidedDraws,0);
 for(const m of o.children)if(m instanceof THREE.Mesh){
  m.geometry.dispose();m.material.dispose();
 }
});
test('E6.20 does not touch mixed-material or independent-owner geometry',()=>{
 const a=new THREE.Group(),b=new THREE.Group();
 const one=new THREE.MeshStandardMaterial(),two=new THREE.MeshStandardMaterial();
 part(a,one,0);part(a,two,3);part(b,one,6);
 const result=compileRigidVisualOwner(a);
 assert.equal(result.sourceMeshes,0);
 assert.equal(a.children.length,2);
 assert.equal(b.children.length,1);
 for(const o of [a,b])for(const m of o.children)
  if(m instanceof THREE.Mesh)m.geometry.dispose();
 one.dispose();two.dispose();
});
