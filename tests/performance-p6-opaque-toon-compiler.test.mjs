import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {compileRigidVisualOwner}
 from '../src/rendering/fieldwork-model-compiler.ts';

function box(o,mat,x=0){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,3,4),mat);
 mesh.position.x=x;mesh.castShadow=true;mesh.receiveShadow=true;
 o.add(mesh);return mesh;
}
function bounds(o){
 o.updateMatrixWorld(true);
 const result=new THREE.Box3();
 function add(node,hidden=false){
  if(hidden||!node.visible)return;
  if(node instanceof THREE.Mesh)
   result.union(new THREE.Box3().setFromObject(node));
  for(const child of node.children)add(child);
 }
 add(o);
 return result;
}
const close=(a,b)=>assert.ok(a.distanceTo(b)<1e-5,
 'rigid compiled geometry must preserve exact world bounds');

test('P6.G Toon is always opt-in; default and independent joints remain untouched',()=>{
 const owner=new THREE.Group(),mat=new THREE.MeshToonMaterial();
 const a=box(owner,mat,-3),b=box(owner,mat,3);
 const movingJoint=new THREE.Group();movingJoint.name='operator-elbow';
 movingJoint.position.set(8,1,0);
 const child=box(movingJoint,mat,0);
 owner.add(movingJoint);
 assert.equal(compileRigidVisualOwner(owner).avoidedDraws,0);
 assert.equal(a.parent,owner);assert.equal(b.parent,owner);
 const before=bounds(owner);
 const compiled=compileRigidVisualOwner(owner,{allowOpaqueToon:true});
 assert.equal(compiled.sourceMeshes,2);
 assert.equal(compiled.compiledMeshes,1);
 assert.equal(compiled.avoidedDraws,1);
 close(before.min,bounds(owner).min);close(before.max,bounds(owner).max);
 assert.equal(child.parent,movingJoint,'IK child stays attached to its moving bone');
 movingJoint.rotation.z=.47;
 assert.equal(child.parent,movingJoint);
 compiled.restore();compiled.restore();
 assert.equal(a.parent,owner);assert.equal(b.parent,owner);
 assert.equal(compiled.archive?.parent,null);
 for(const item of [a,b,child])item.geometry.dispose();mat.dispose();
});
test('P6.G cannot merge semitransparent, alpha-tested, named or hidden Toon parts',()=>{
 const parent=new THREE.Group();
 const plain=new THREE.MeshToonMaterial();
 const translucent=new THREE.MeshToonMaterial({transparent:true,opacity:.8});
 const alpha=new THREE.MeshToonMaterial({alphaTest:.3});
 const named=box(parent,plain,1);named.name='rig-action-anchor';
 const hidden=box(parent,plain,4);hidden.visible=false;
 const candidates=[named,hidden];
 for(const material of [translucent,alpha]){
  candidates.push(box(parent,material,9),box(parent,material,14));
 }
 assert.equal(compileRigidVisualOwner(parent,{allowOpaqueToon:true}).avoidedDraws,0);
 assert.equal(compileRigidVisualOwner(parent,{allowOpaqueToon:true,
  mode:'opaque-facade'}).avoidedDraws,0);
 for(const mesh of candidates)mesh.geometry.dispose();
 for(const material of [plain,translucent,alpha])material.dispose();
});
test('P6.G never merges separate material instances, shadow contracts or independent owners',()=>{
 const o=new THREE.Group(),another=new THREE.Group();
 const shared=new THREE.MeshToonMaterial(),different=shared.clone();
 const a=box(o,shared,0),b=box(o,different,3);
 const c=box(another,shared,9);
 const d=box(o,shared,12);d.castShadow=false;
 assert.equal(compileRigidVisualOwner(o,{allowOpaqueToon:true}).avoidedDraws,0);
 assert.equal(c.parent,another);
 for(const item of [a,b,c,d])item.geometry.dispose();
 shared.dispose();different.dispose();
});
test('P6.G preserves material identity and render state for rigid Toon geometry',()=>{
 const parent=new THREE.Group();parent.position.set(11,3,9);
 parent.rotation.y=.42;
 const toon=new THREE.MeshToonMaterial({color:0x345677});
 const a=box(parent,toon,-2),b=box(parent,toon,2);
 const expected=bounds(parent);
 const result=compileRigidVisualOwner(parent,{allowOpaqueToon:true});
 const merged=parent.children.find(c=>c instanceof THREE.Mesh);
 assert.equal(result.avoidedDraws,1);
 assert.equal(merged.material,toon);
 assert.equal(merged.castShadow,a.castShadow);
 assert.equal(merged.receiveShadow,a.receiveShadow);
 close(expected.min,bounds(parent).min);close(expected.max,bounds(parent).max);
 parent.position.x+=5;
 assert.ok(bounds(parent).min.x>expected.min.x+4.99,
  'compiled parts follow the same parent transform');
 result.restore();
 for(const item of [a,b])item.geometry.dispose();
 toon.dispose();
});
