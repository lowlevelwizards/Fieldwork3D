import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {CUBE_HEAD_ANATOMY as A} from '../src/operator-head-anatomy.ts';
import {UNIFIED_HELMET_HEMS} from '../src/operator-ach-mich-unified-shell.ts';
import {createHeadwearSilhouette,HEAD_SILHOUETTE_METRICS}
 from '../src/operator-headwear-silhouettes.ts';
import {achMichHemY,achMichProfile,createAchMichBindingGeometry,
 achMichBindingHeight,achMichRetentionPaths}
 from '../src/operator-ach-mich-details.ts';
import {createAchMichDrapedGeometry}
 from '../src/operator-ach-mich-cover-drape.ts';

const near=(a,b,e=.002)=>Math.abs(a-b)<=e;
test('H20: five comparable archetypes preserve their independent style identities',()=>{
 const ids=['pasgt','ach','mich-2002','mich-2001','fast-sf'];
 for(const id of ids){
  const model=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  assert.equal(model.children.length,1,id);
  const g=model.children[0].geometry;
  assert.ok(g.boundingBox && g.boundingBox.max.y>A.skullTop,id);
 }
 // PASGT's peak reaches much farther forward than the MICH brow.
 assert.ok(HEAD_SILHOUETTE_METRICS.pasgt.frontExtent<
  HEAD_SILHOUETTE_METRICS.ach.frontExtent-.65);
 // The FAST is deliberately not treated as the MICH TC-2001's same geometry.
 const fast=createHeadwearSilhouette('fast-sf',new THREE.MeshStandardMaterial());
 assert.ok(fast.children[0].geometry.userData.h17UnifiedContour!==true);
});

test('H20: full, partial and open-ear cuts have an emphatic three-step hierarchy',()=>{
 const full=UNIFIED_HELMET_HEMS.ach,
  mid=UNIFIED_HELMET_HEMS['mich-2002'],
  high=UNIFIED_HELMET_HEMS['mich-2001'];
 assert.equal(full.length,6);assert.equal(mid.length,6);assert.equal(high.length,6);
 for(const hem of [full,mid,high]){
  assert.ok(hem.every(p=>p[0]>=hem[0][0]&&p[0]<=hem[0][0]+.3));
  for(let i=1;i<hem.length;i++)assert.ok(hem[i][2]-hem[i-1][2]>=.69,'no tiny contour notches');
 }
 assert.ok(near(full[2][1],2.04));
 assert.ok(near(mid[2][1],3.06));
 assert.ok(near(high[2][1],5.30));
 assert.ok(high[2][1]-mid[2][1]>2.0,'ear arch must be iconic at game scale');
 assert.ok(mid[2][1]-full[2][1]>=1.0);
 assert.ok(near(high[0][1],4.55));
 assert.ok(near(high[1][1],4.55));
 assert.ok(near(high[3][1],5.30));
 assert.ok(high[2][1]-high[1][1]>=.70,'high cut rises visibly above the brow');
 assert.ok(near(high[4][1],2.05)&&near(high[5][1],2.05));
 assert.ok(high[3][1]-high[4][1]>=1.35,
  'deep rear return rather than floating cap');
 assert.ok(high[2][1]-A.earTop>=1.2,'clean opening over implied ear');
 assert.ok(high[4][1] < A.earTop,'protective rear crosses upper ear line');
 assert.ok(near(HEAD_SILHOUETTE_METRICS['mich-2001'].earEdge,5.30));
 assert.equal(achMichProfile('mich-2001').hem,high,
  'shared source drives shell, cover and binding');
});

test('H26: static shell with shared cover, trim and retention',()=>{
 for(const id of ['ach','mich-2002','mich-2001']){
  const g=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  const mesh=g.children[0].geometry;
  assert.equal(mesh.userData.h17UnifiedContour,true);
  assert.equal(mesh.userData.exteriorQuads,id==='mich-2001'?39:49);
  assert.equal(mesh.index.count,id==='mich-2001'?234:294);
  assert.equal(g.children.length,1,'one static shell draw');
  const cover=createAchMichDrapedGeometry(id),
    trim=createAchMichBindingGeometry(id),p=achMichProfile(id);
  assert.equal(trim.userData.segmentCount,12);
  assert.ok(near(trim.userData.minimumHeight,achMichBindingHeight(id)));
  assert.ok(near(trim.boundingBox.min.y,p.hem.reduce((a,v)=>Math.min(a,v[1]),10)));
  assert.ok(cover.boundingBox.max.y>=mesh.boundingBox.max.y);
  assert.equal(achMichRetentionPaths(id).length,6);
 }
 assert.ok(near(achMichHemY('mich-2001',.5),5.30));
 assert.ok(near(achMichHemY('mich-2001',5),2.05));
 assert.ok(near(achMichBindingHeight('mich-2001'),.42));
});

test('H20: comparison includes all five archetypes at one orthographic scale',()=>{
 const svg=readFileSync(new URL('../docs/helmet-h20-side-orthos.svg',import.meta.url),'utf8');
 assert.match(svg,/FIELDWORK H20/);
 for(const name of ['PASGT','MICH 2000','MICH 2002','MICH 2001','FAST SF'])
  assert.ok(svg.includes(name),'missing '+name);
 assert.match(svg,/Head cube shown translucent/);
 const docs=readFileSync(new URL('../docs/helmet-h20-reference-calibration.md',import.meta.url),'utf8');
 assert.match(docs,/not.*converted from real-world millimeters/i);
 assert.match(docs,/58 triangles/);
 assert.match(docs,/MSA ACH TC-2000/);
});
