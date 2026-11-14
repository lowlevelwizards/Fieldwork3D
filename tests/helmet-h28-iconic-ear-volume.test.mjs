import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {UNIFIED_HELMET_HEMS,UNIFIED_HELMET_EAR_SHOULDERS,
 ACH_MICH_LOWER_EDGE_RETURN_HEIGHT}
 from '../src/operator-ach-mich-unified-shell.ts';
import {createHeadwearSilhouette} from '../src/operator-headwear-silhouettes.ts';
import {createAchMichDrapedGeometry,ACH_MICH_COVER_OFFSET}
 from '../src/operator-ach-mich-cover-drape.ts';
import {createAchMichBindingGeometry} from '../src/operator-ach-mich-details.ts';
const cuts=['ach','mich-2002','mich-2001'];
const near=(a,b,e=.015)=>Math.abs(a-b)<e;
test('H29: preserve exaggerated depth without H28 lateral ear extrusion',()=>{
 const f=UNIFIED_HELMET_HEMS.ach,m=UNIFIED_HELMET_HEMS['mich-2002'],
  h=UNIFIED_HELMET_HEMS['mich-2001'];
 assert.ok(m[2][1]-f[2][1]>=1,'full cut remains deeper than mid');
 assert.ok(h[2][1]-m[2][1]>2,'high cut retains open ear');
 for(const id of cuts){
  const hem=UNIFIED_HELMET_HEMS[id],shell=createHeadwearSilhouette(
   id,new THREE.MeshStandardMaterial());
  assert.equal(shell.children.length,1);
  assert.equal(shell.children[0].geometry.userData.exteriorQuads,39);
  assert.equal(shell.children[0].geometry.userData.h29NoEarExtrusion,true);
  assert.deepEqual(UNIFIED_HELMET_EAR_SHOULDERS[id],hem.map(p=>p[0]));
  assert.ok(near(ACH_MICH_LOWER_EDGE_RETURN_HEIGHT,.34));
  for(let i=1;i<hem.length;i++)assert.ok(hem[i][2]>hem[i-1][2]);
 }
});
test('H29: cover and binding share the single sculpted lower silhouette',()=>{
 for(const id of cuts){
  const cover=createAchMichDrapedGeometry(id),
   fold=createAchMichDrapedGeometry(id,true),
   binding=createAchMichBindingGeometry(id),
   shell=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial())
    .children[0].geometry;
  assert.equal(cover.userData.h29ContourDrivenCover,true);
  assert.equal(cover.getAttribute('position').count,cover.getAttribute('uv1').count);
  assert.ok(cover.boundingBox.max.x>=shell.boundingBox.max.x+
   ACH_MICH_COVER_OFFSET-.11);
  assert.ok(binding.getAttribute('position').count>0);
  assert.ok(fold.getAttribute('position').count>35);
 }
});
