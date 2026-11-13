import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ACH_MICH_SHELLS,headwearCuboidVolumes,
 ACH_MICH_UPPER_INSET,ACH_MICH_BEVEL_HEIGHT}
 from '../src/operator-headwear-silhouettes.ts';
import {achMichProfile,achMichHemY,achMichRetentionPaths,
 createAchMichRetentionGeometry,createAchMichBindingGeometry,
 createAchMichDetails,ACH_MICH_BINDING_HEIGHT}
 from '../src/operator-ach-mich-details.ts';
import {createAchMichDrapedGeometry}
 from '../src/operator-ach-mich-cover-drape.ts';

test('H6 stud pair seats directly above the same two under-rim harness exits',()=>{
 for(const id of ACH_MICH_SHELLS){
  const p=achMichProfile(id),paths=achMichRetentionPaths(id);
  assert.equal(paths.length,6);
  for(const [bolt,offset] of [[p.frontStud,0],[p.rearStud,1]]){
   const hem=achMichHemY(id,bolt[2]);
   assert.ok(Math.abs(bolt[1]-(hem+.55))<.10,
    id+' screw within binding above webbing exit');
   for(let side=0;side<2;side++){
    const anchor=paths[side*3+offset][0];
    assert.equal(anchor[2],bolt[2],id+' hardware and exit share Z');
    assert.ok(anchor[1]<hem-.1&&anchor[1]>hem-.3);
    assert.ok(Math.abs(anchor[0])<p.side-.35,'webbing begins inside rim');
   }
  }
 }
});
test('H6 no dangling rear detours: each of two suspensions joins a single jaw point',()=>{
 for(const id of ACH_MICH_SHELLS){
  const paths=achMichRetentionPaths(id);
  assert.equal(paths.length,6);
  for(let side=0;side<2;side++){
   assert.equal(paths[side*3].length,2);
   assert.equal(paths[side*3+1].length,2);
   assert.equal(paths[side*3+2].length,2);
   assert.deepEqual(paths[side*3][1],paths[side*3+1][1]);
   assert.deepEqual(paths[side*3+2][0],paths[side*3][1]);
  }
  const geometry=createAchMichRetentionGeometry(id);
  assert.equal(geometry.userData.integratedChinCup,true);
  assert.ok(geometry.getAttribute('position').count>=40);
  assert.ok(geometry.getAttribute('position').count<80);
  assert.ok(geometry.boundingBox.min.z<-4.40&&geometry.boundingBox.min.z>-4.85);
  assert.ok(geometry.boundingBox.max.x<4.95&&geometry.boundingBox.min.x>-4.95,
   'retention webbing stays inside the actual side shell, no dangling flare');
 }
});
test('H6 one unlit tintable band and a single unified strap mesh, no duplicate chin cup',()=>{
 assert.ok(ACH_MICH_BINDING_HEIGHT>=.75);
 for(const id of ACH_MICH_SHELLS){
  const group=new THREE.Group();
  const details=createAchMichDetails(group,id);
  assert.ok(details.bindingMaterial instanceof THREE.MeshBasicMaterial);
  assert.equal(details.bindingMaterial.vertexColors,false);
  assert.equal(details.bare.children.length,1);
  assert.equal(details.strap.children.length,1);
  assert.equal(details.strap.children[0].geometry.userData.integratedChinCup,true);
  assert.equal(details.hardware.userData.achMichRetentionScrews,4);
  assert.ok(createAchMichBindingGeometry(id).userData.segmentCount>=6);
 }
});
test('H6 ACH ear/nape transition remains broad and cover still shares exact H5 crown',()=>{
 assert.equal(ACH_MICH_BEVEL_HEIGHT,1.10);
 assert.equal(ACH_MICH_UPPER_INSET,.53);
 const p=achMichProfile('ach');
 for(let i=1;i<p.hem.length;i++)
  assert.ok(p.hem[i][2]-p.hem[i-1][2]>=.46,
   'minimum perimeter spacing prevents small zigzag facets');
 const volumes=headwearCuboidVolumes('ach');
 const temple=volumes.find(v=>v.name==='ach-right-temple');
 const nape=volumes.find(v=>v.name==='ach-right-nape-return');
 assert.ok(temple&&nape);
 assert.ok(temple.depth>=2.7&&nape.depth>=2.9);
 for(const id of ACH_MICH_SHELLS){
  const cover=createAchMichDrapedGeometry(id);
  assert.equal(cover.userData.achMichDirectFrontRearDiagonal,true);
  assert.equal(cover.userData.printPanels.length,3);
 }
});
