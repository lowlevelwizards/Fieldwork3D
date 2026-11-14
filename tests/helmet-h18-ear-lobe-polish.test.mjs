import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ACH_MICH_SHELLS,createHeadwearSilhouette,headwearCuboidVolumes,
 HEAD_SILHOUETTE_METRICS} from '../src/operator-headwear-silhouettes.ts';
import {UNIFIED_HELMET_HEMS} from '../src/operator-ach-mich-unified-shell.ts';
import {achMichProfile,achMichBindingHeight,achMichHemY,
 createAchMichBindingGeometry,achMichRetentionPaths}
 from '../src/operator-ach-mich-details.ts';
import {createAchMichDrapedGeometry} from '../src/operator-ach-mich-cover-drape.ts';

const near=(a,b,eps=.002)=>Math.abs(a-b)<eps;

test('H18: Full and Mid have distinct, single-piece iconic ear lobes',()=>{
 const f=UNIFIED_HELMET_HEMS.ach,m=UNIFIED_HELMET_HEMS['mich-2002'];
 for(const [id,hem] of [['ach',f],['mich-2002',m]]){
  assert.equal(hem.length,6,'reuse the exact same six existing perimeter points');
  const x=hem[0][0];
  assert.ok(hem.every(p=>p[0]===x),'no applied plate or outward ear slab');
  for(let i=1;i<hem.length;i++)
   assert.ok(hem[i][2]-hem[i-1][2]>.6,'one ordered angular outline');
  assert.ok(near(hem[2][1],hem[3][1]),'one flat oversized ear lobe');
  assert.ok(near(hem[4][1],hem[5][1]),'one uninterrupted nape');
  assert.ok(hem[4][1]-hem[3][1]>.6,'ear bump stands below nape');
  assert.ok(hem[3][2]-hem[2][2]>3.4,'broad feature reads at gameplay scale');
  assert.equal(achMichProfile(id).hem,hem,'shell, cover and binding share a source');
  assert.equal(headwearCuboidVolumes(id).length,5,'no new stacked side boxes');
  assert.ok(near(HEAD_SILHOUETTE_METRICS[id].earEdge,hem[2][1]));
 }
 assert.ok(near(f[2][1],2.04)&&near(m[2][1],3.06));
 assert.ok(near(f[5][1],2.72)&&near(m[5][1],3.82));
 assert.ok(m[2][1]-f[2][1]>=1,'Full-Cut is recognizably deeper');
 assert.ok(m[5][1]-f[5][1]>=1,'the nape coverage is also distinguishable');
 assert.ok(near(HEAD_SILHOUETTE_METRICS['mich-2001'].earEdge,5.30));
});

test('H18: fewer rim pixels without new geometry and fabric stays synchronized',()=>{
 for(const id of ACH_MICH_SHELLS){
  const cover=createAchMichDrapedGeometry(id),binding=createAchMichBindingGeometry(id);
  const height=achMichBindingHeight(id);
  assert.ok(near(height,id==='mich-2001'?.42:.52));
  assert.ok(near(binding.userData.minimumHeight,height));
  const p=achMichProfile(id),attrib=cover.getAttribute('position');
  for(const z of [p.front,p.rear]){
   const y=(z===p.front?p.brow:p.nape)+height+.035;
   let matches=0;
   for(let i=0;i<attrib.count;i++)
    if(near(attrib.getY(i),y,.003))matches++;
   assert.ok(matches>0,'draped cover offset follows same reduced binding height');
  }
  const straps=achMichRetentionPaths(id);
  assert.equal(straps.length,6);
  for(const [stud,offset] of [[p.frontStud,0],[p.rearStud,1]]){
   if(id==='mich-2001')
    assert.ok(stud[1]>achMichHemY(id,stud[2])+.40,
     'unchanged High-Cut hardware still clears its binding');
   else
    assert.ok(near(stud[1],achMichHemY(id,stud[2])+.55,.055),
     'Full/Mid screw height follows updated lower contour');
   for(let side=0;side<2;side++)
    assert.ok(straps[side*3+offset][0][1]<achMichHemY(id,stud[2])-.10);
  }
 }
});

test('H19: identical crown language, 58 triangles for all three helmet cuts',()=>{
 for(const [id,roof] of [['ach',8.84],['mich-2002',8.75]]){
  const group=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  assert.equal(group.children.length,1);
  const g=group.children[0].geometry;
  assert.equal(g.userData.h17UnifiedContour,true);
  assert.equal(g.userData.exteriorQuads,29);
  assert.equal(g.index.count,174,'29 quads = 58 triangles');
  assert.ok(near(g.boundingBox.max.y,roof));
  assert.equal(g.userData.achMichCrownInset,.53);
  assert.equal(g.userData.achMichBevelHeight,1.10);
 }
 const high=createHeadwearSilhouette('mich-2001',new THREE.MeshStandardMaterial());
 assert.equal(high.children[0].geometry.userData.h17UnifiedContour,true);
 assert.equal(high.children[0].geometry.userData.exteriorQuads,29);
 assert.ok(near(achMichHemY('mich-2001',0),5.30));
});
