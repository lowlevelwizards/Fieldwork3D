import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {StaticSceneBatches} from '../src/rendering/breach-static-batcher.ts';

function frame(){
 const root=new THREE.Group();
 const geometry=new THREE.BoxGeometry(4,7,3);
 const material=new THREE.MeshStandardMaterial({color:0x776b5e});
 const owners=Array.from({length:5},(_,i)=>{
   const owner=new THREE.Group();owner.position.set(i*25,0,0);
   const mesh=new THREE.Mesh(geometry,material);
   mesh.position.set(0,6,0);mesh.castShadow=true;
   owner.add(mesh);root.add(owner);
   return {owner,mesh};
 });
 root.updateWorldMatrix(true,true);
 return {root,geometry,material,owners};
}
test('static box instancing reduces five same-shape draws to one',()=>{
 const {root,geometry,owners}=frame();
 const batches=new StaticSceneBatches();
 for(const {owner} of owners)
   batches.collect(owner,owner,new Set([geometry]));
 batches.flush(root);
 assert.deepEqual(batches.stats(),{original:5,instances:1,avoided:4});
 assert.ok(owners.every(({owner})=>owner.children.length===0));
 const instanced=root.children.find(o=>o instanceof THREE.InstancedMesh);
 assert.ok(instanced);
 assert.equal(instanced.count,5);
 const matrix=new THREE.Matrix4(),pos=new THREE.Vector3();
 instanced.getMatrixAt(4,matrix);
 pos.setFromMatrixPosition(matrix);
 assert.ok(Math.abs(pos.x-100)<.0001);
 batches.setVisible(owners[4].owner,false);
 instanced.getMatrixAt(4,matrix);
 assert.equal(matrix.determinant(),0,'hidden owner never leaks its instance');
 batches.setVisible(owners[4].owner,true);
 instanced.getMatrixAt(4,matrix);
 pos.setFromMatrixPosition(matrix);assert.equal(pos.x,100);
 batches.clear();
 assert.equal(batches.stats().avoided,0);
 assert.ok(!root.children.includes(instanced));
 geometry.dispose();
});

test('never batches unique materials or independently controlled children',()=>{
 const {root,geometry,owners}=frame();
 const batches=new StaticSceneBatches();
 owners[0].mesh.material=new THREE.MeshStandardMaterial({color:0xff0000,
   transparent:true,opacity:.5});
 owners[1].mesh.visible=false;
 owners[2].mesh.children.push(new THREE.Group());
 const onlyOne=new Set([geometry]);
 for(const {owner} of owners)
   batches.collect(owner,owner,onlyOne);
 batches.flush(root);
 assert.equal(batches.stats().original,2,'only eligible shared opaque boxes');
 assert.equal(batches.stats().instances,1);
 assert.equal(owners[0].owner.children.length,1);
 assert.equal(owners[1].owner.children.length,1);
 assert.equal(owners[2].owner.children.length,1);
 batches.clear();
 geometry.dispose();
});
