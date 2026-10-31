import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {addRoomGroutInstances} from '../src/breach-room-instancing.ts';
test('room grout uses one instance draw with correct stripe locations',()=>{
 const parent=new THREE.Group(),mat=new THREE.MeshBasicMaterial();
 const mesh=addRoomGroutInstances(parent,{x:20,y:30,w:180,h:145},mat);
 assert.ok(mesh);assert.equal(parent.children.length,1);
 assert.ok(mesh.count>=6);
 const out=new THREE.Matrix4();mesh.getMatrixAt(0,out);
 const pos=new THREE.Vector3(),scale=new THREE.Vector3(),q=new THREE.Quaternion();
 out.decompose(pos,q,scale);
 assert.equal(pos.y,-.01);assert.ok(scale.z>50);
 mesh.geometry.dispose();mat.dispose();
});