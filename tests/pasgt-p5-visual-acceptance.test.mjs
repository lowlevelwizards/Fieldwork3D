import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPasgtFieldDress,createPasgtNetGeometry}
 from '../src/operator-pasgt-field-dress.ts';
test('pixel leaf cards project above the helmet rim instead of vanishing into fabric',()=>{
 const root=new THREE.Group(),v=createPasgtFieldDress(root);
 const yMax=v.foliage.children.map(m=>{
  const p=new THREE.Vector3();
  const mesh=m.children[0];
  const top=mesh.geometry;
  top.computeBoundingBox();
  p.set(0,top.boundingBox.max.y,0).multiplyScalar(mesh.scale.y);
  p.applyQuaternion(m.quaternion);
  return m.position.y+p.y;
 });
 assert.ok(yMax.filter(y=>y>8.95).length>=2,
  'at least two leaf silhouettes break crown outline');
 for(const mount of v.foliage.children){
  assert.ok(mount.userData.pasgtSlitId);
  assert.ok(mount.children[0].scale.y>=1);
 }
});
test('net no longer extends long vertical poles below the retaining band',()=>{
 const g=createPasgtNetGeometry();
 assert.equal(g.userData.pasgtNetPattern,'sparse-diamond');
 assert.ok(g.boundingBox.min.y>=4.6,'net held around helmet, not hanging as poles');
 assert.ok(g.boundingBox.max.y>8.85);
});
