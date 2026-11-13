import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAchMichDetails,createAchMichRetentionGeometry}
 from '../src/operator-ach-mich-details.ts';
test('ACH/MICH fastened buckles use four visible triangles instead of hidden box faces',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createAchMichDetails(new THREE.Group(),shell);
  const buckle=kit.strap.getObjectByName('fastened-four-point-adjustment-buckle');
  assert.ok(buckle instanceof THREE.Mesh);
  assert.equal(buckle.geometry.getAttribute('position').count,12);
  assert.equal(buckle.userData.buckleFaces,4);
  assert.equal(buckle.userData.buckleCount,2);
  assert.equal(kit.strap.children.filter(x=>x instanceof THREE.Mesh).length,2,
   'one static webbing mesh and one flat buckle mesh, no per-side draw calls');
  assert.equal(createAchMichRetentionGeometry(shell).getAttribute('position').count,54,
   'preserve the 4-point fastened webbing and stitched chin cup');
 }
});
