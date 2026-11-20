import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {compileRigidVisualOwner} from '../src/rendering/fieldwork-model-compiler.ts';
import {releaseSiteSceneObjects} from '../src/rendering/site-scene-lifecycle.ts';
import {readFileSync} from 'node:fs';
const code=()=>readFileSync(new URL('../src/rendering/breach-site-scene-builder.ts',import.meta.url),'utf8');
function box(parent,x,mat,opts={}){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,3,4),mat);
 mesh.position.x=x;
 mesh.castShadow=!!opts.castShadow;
 parent.add(mesh);return mesh;
}
test('E6.21 inherited moving leaf transform remains identical after compiling child parts',()=>{
 const root=new THREE.Group(),leaf=new THREE.Group();
 root.add(leaf);root.position.set(100,0,60);root.rotation.y=.4;
 leaf.position.set(16,0,0);leaf.rotation.y=-.65;
 const mat=new THREE.MeshStandardMaterial();
 box(leaf,-4,mat);box(leaf,4,mat);
 const original=new THREE.Box3().setFromObject(leaf);
 const result=compileRigidVisualOwner(leaf);
 assert.equal(result.avoidedDraws,1);
 let current=new THREE.Box3().setFromObject(leaf);
 assert.ok(current.min.distanceTo(original.min)<.0001);
 assert.ok(current.max.distanceTo(original.max)<.0001);
 leaf.rotation.y=1.1;root.rotation.y=-1.4;root.updateMatrixWorld(true);
 current=new THREE.Box3().setFromObject(leaf);
 assert.equal(current.isEmpty(),false);
 assert.equal(leaf.children.filter(c=>c instanceof THREE.Mesh).length,1);
 result.restore();mat.dispose();
});
test('E6.21 archived visual parts are disposed once on site reset, not shared cache',()=>{
 const root=new THREE.Group(),group=new THREE.Group();root.add(group);
 const material=new THREE.MeshStandardMaterial();
 const geo=new THREE.BoxGeometry(2,2,2);
 const a=new THREE.Mesh(geo,material),b=new THREE.Mesh(geo,material);
 b.position.x=6;group.add(a,b);
 const result=compileRigidVisualOwner(group);
 assert.equal(result.avoidedDraws,1);
 const compiled=group.children.find(c=>c instanceof THREE.Mesh);
 let geometryDisposed=0,compiledDisposed=0;
 geo.addEventListener('dispose',()=>geometryDisposed++);
 compiled.geometry.addEventListener('dispose',()=>compiledDisposed++);
 releaseSiteSceneObjects(root,new Set(),new Set());
 assert.equal(geometryDisposed,1);
 assert.equal(compiledDisposed,1);
 assert.equal(root.children.length,0);
 material.dispose();
});
test('E6.21 keeps independently hidden interior architectural room owners distinct',()=>{
 const root=new THREE.Group();
 const m=new THREE.MeshStandardMaterial();
 const owners=[0,10].map((x,i)=>{
  const owner=new THREE.Group();owner.position.x=x;
  owner.visible=i===0;root.add(owner);
  box(owner,-2,m);box(owner,2,m);
  return owner;
 });
 const a=compileRigidVisualOwner(owners[0]);
 const b=compileRigidVisualOwner(owners[1]);
 assert.equal(a.avoidedDraws,1);
 assert.equal(b.avoidedDraws,1);
 assert.equal(owners[1].visible,false);
 assert.notEqual(owners[0].children.find(c=>c instanceof THREE.Mesh),
  owners[1].children.find(c=>c instanceof THREE.Mesh));
 releaseSiteSceneObjects(root,new Set(),new Set());m.dispose();
});
test('E6.21 source keeps dynamic and independently controlled boundaries',()=>{
 const s=code();
 assert.ok(s.includes("get('e621Bake')!=='0'"));
 assert.ok(s.includes("get('e620Bake')!=='0'"));
 assert.match(s,/for\(const opening of host\.architecturalOpenings\)/);
 assert.match(s,/owner\.userData\.fogFacade===true/);
 assert.match(s,/exclude:new Set\(\[glass\]\)/);
 assert.match(s,/exclude:new Set\(\[door\.threshold,door\.wedge\]\)/);
 assert.match(s,/mode:exterior\?'opaque-facade':'opaque'/);
 assert.match(s,/exclude:new Set\(\[door\.intactHardware,\s*\.\.\.\(door\.glassPane\?\[door\.glassPane\]:\[\]\)\]\)/,
  'door glass and intact hardware must remain independently hidden/broken outside the rigid leaf bake');
});
