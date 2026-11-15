import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CUBE_HEAD_ANATOMY as A} from '../src/operator-head-anatomy.ts';
import {HEAD_SILHOUETTE_METRICS,createHeadwearSilhouette,HEADWEAR_FIT_TARGETS}
 from '../src/operator-headwear-silhouettes.ts';
test('A1: approved full/mid/high cuts preserve independent head coverage',()=>{
 assert.ok(A.brow>A.earTop&&A.earTop>A.earCenter);
 assert.ok(HEADWEAR_FIT_TARGETS.ach.ear<A.earTop);
 assert.ok(HEAD_SILHOUETTE_METRICS['mich-2001'].earEdge>
  HEAD_SILHOUETTE_METRICS['mich-2002'].earEdge);
 for(const id of ['ach','mich-2002','mich-2001']){
  const mesh=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  assert.equal(mesh.children.length,1);
  assert.ok(mesh.children[0].geometry.boundingBox.max.y>A.skullTop);
 }
});
