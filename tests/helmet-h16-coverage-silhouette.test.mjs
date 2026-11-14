import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ACH_MICH_SHELLS,headwearCuboidVolumes,HEAD_SILHOUETTE_METRICS,
 createHeadwearSilhouette} from '../src/operator-headwear-silhouettes.ts';
import {UNIFIED_HELMET_HEMS,UNIFIED_HELMET_EAR_SHOULDERS} from '../src/operator-ach-mich-unified-shell.ts';
import {achMichProfile,achMichHemY,createAchMichBindingGeometry,
 achMichRetentionPaths} from '../src/operator-ach-mich-details.ts';
import {createAchMichDrapedGeometry}
 from '../src/operator-ach-mich-cover-drape.ts';
import {HELMET_MOUNT_PROFILES}
 from '../src/operator-helmet-attachment-frames.ts';

test('H17: Full and Mid are one integrated skirt; High retains open ears',()=>{
 for(const [id,ear,nape] of [['ach',2.04,1.85],
  ['mich-2002',3.06,1.90]]){
  const v=headwearCuboidVolumes(id),p=achMichProfile(id);
  assert.equal(v.length,5,'three large envelope sectors and one side per ear');
  assert.equal(v.filter(x=>x.name.includes('ear-nape')).length,2);
  assert.equal(v.filter(x=>/temple|ear-wrap|rear-return/.test(x.name)).length,0);
  assert.equal(p.hem,UNIFIED_HELMET_HEMS[id]);
  assert.equal(p.hem.length,6,'one direct six-point outline');
  assert.ok(p.hem.every(pt=>pt[0]>=p.side&&pt[0]<=p.side+.3),
   'one continuous slightly flared side without floating plates');
  assert.equal(achMichHemY(id,.5),ear);
  assert.equal(achMichHemY(id,5.4),nape);
  assert.equal(HEAD_SILHOUETTE_METRICS[id].earEdge,ear);
 }
 assert.equal(HEAD_SILHOUETTE_METRICS['mich-2001'].earEdge,5.30);
 assert.equal(HELMET_MOUNT_PROFILES['mich-2002'].ear,4.05);
 assert.equal(HELMET_MOUNT_PROFILES.ach.ear,2.92);
});

test('H17: single low-poly shell and matching cover/binding envelopes',()=>{
 for(const id of ACH_MICH_SHELLS){
  const g=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial()),
   mesh=g.children[0],edge=createAchMichBindingGeometry(id),
   cloth=createAchMichDrapedGeometry(id),
   straps=achMichRetentionPaths(id);
  assert.equal(g.children.length,1);
  assert.ok(mesh.geometry.boundingBox);
  assert.equal(straps.length,6);
  assert.ok(edge.getAttribute('position').count<150);
  assert.ok(cloth.boundingBox.max.y>mesh.geometry.boundingBox.max.y);
  const geometry=mesh.geometry;
  assert.equal(geometry.userData.h17UnifiedContour,true);
  assert.ok(geometry.userData.exteriorQuads<=59);
  assert.ok(geometry.getAttribute('position').count<=354);
  assert.ok(geometry.getAttribute('uv1').count>0);
  assert.equal(geometry.userData.achMichCrownInset,.53);
  assert.equal(geometry.userData.achMichBevelHeight,1.10);
  assert.ok(geometry.getAttribute('color').count>0);
  const widest=Math.max(...UNIFIED_HELMET_HEMS[id].map(p=>p[0]),
   ...UNIFIED_HELMET_EAR_SHOULDERS[id]);
  assert.ok(geometry.boundingBox.max.x<=widest+.001);
  assert.ok(geometry.boundingBox.min.x>=-widest-.001);
 }
});
