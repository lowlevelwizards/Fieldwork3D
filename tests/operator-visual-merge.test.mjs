import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {consolidateVisualGroup} from '../src/operator-visual-mesh-merge.ts';
test('static same-material components are merged without changing bounds',()=>{
 const group=new THREE.Group();
 const material=new THREE.MeshStandardMaterial();
 for(let i=0;i<4;i++){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,2,3),material);
  mesh.position.x=i*2;group.add(mesh);
 }
 group.updateMatrixWorld(true);
 const before=new THREE.Box3().setFromObject(group);
 consolidateVisualGroup(group);
 const after=new THREE.Box3().setFromObject(group);
 assert.equal(group.children.length,1);
 assert.ok(before.min.distanceTo(after.min)<1e-5);
 assert.ok(before.max.distanceTo(after.max)<1e-5);
 group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 material.dispose();
});
