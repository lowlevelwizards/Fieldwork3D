import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
 UNIFIED_HELMET_HEMS,UNIFIED_HELMET_EAR_SHOULDERS,
 ACH_MICH_EAR_UPPER_BEVEL_HEIGHT,unifiedHelmetEarVerticalProfile
} from '../src/operator-ach-mich-unified-shell.ts';
import {createHeadwearSilhouette,headwearCuboidVolumes,ACH_MICH_BEVEL_HEIGHT}
 from '../src/operator-headwear-silhouettes.ts';
import {createAchMichDrapedGeometry,ACH_MICH_COVER_OFFSET}
 from '../src/operator-ach-mich-cover-drape.ts';
import {createAchMichBindingGeometry} from '../src/operator-ach-mich-details.ts';
const cuts=['ach','mich-2002','mich-2001'];
const near=(a,b,e=.015)=>Math.abs(a-b)<e;
const has=(pos,x,y,z)=>{for(let i=0;i<pos.count;i++)
 if(near(pos.getX(i),x)&&near(pos.getY(i),y)&&near(pos.getZ(i),z))
  return true;return false;};
test('H28: broad iconic lower face, compact transitions and distinct full/mid/high cuts',()=>{
 for(const id of cuts){
  const hem=UNIFIED_HELMET_HEMS[id],width=UNIFIED_HELMET_EAR_SHOULDERS[id],
   crown=headwearCuboidVolumes(id)[0],shoulder=crown.y+crown.height/2-ACH_MICH_BEVEL_HEIGHT;
  const shell=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  const g=shell.children[0].geometry,p=g.getAttribute('position');
  assert.equal(shell.children.length,1,'no added side plates');
  assert.equal(hem.length,6,'keep the shared hem source of truth');
  assert.ok(g.userData.h28UnifiedEarProfile);
  assert.equal(g.userData.exteriorQuads,id==='mich-2001'?39:59);
  if(id==='mich-2001'){
   assert.ok(width.every(x=>near(x,hem[0][0])),'high cut has no ear bulge');
   assert.ok(hem[2][1]>hem[1][1]+.7,'high-cut ear opening stays high');
   continue;
  }
  const expected=id==='ach'?5.395:5.335;
  assert.ok(near(width[2],expected)&&near(width[3],expected));
  assert.ok(width[2]-hem[0][0]>.28&&width[2]-hem[0][0]<.35,
   'reference-informed modest molded sidewall, not protruding block');
  assert.ok(hem[3][2]-hem[2][2]>2.4,'long rectangular outer face');
  assert.ok(near(width[4],hem[4][0])&&near(width[5],hem[5][0]),
   'rear returns to base nape with no extra wedge tail');
  for(const i of [2,3]){
   const {onsetY,faceTopY,faceBottomY}=unifiedHelmetEarVerticalProfile(
    id,shoulder,hem[i][1],hem[i][2]);
   assert.ok(near(onsetY-faceTopY,ACH_MICH_EAR_UPPER_BEVEL_HEIGHT));
   assert.ok(faceTopY-faceBottomY>1.15,'tall flat protective face');
   assert.ok(faceBottomY>hem[i][1],'compact inward hem return');
   for(const sign of [-1,1]){
    assert.ok(has(p,sign*hem[0][0],onsetY,hem[i][2]));
    assert.ok(has(p,sign*width[i],faceTopY,hem[i][2]));
    assert.ok(has(p,sign*width[i],faceBottomY,hem[i][2]));
   }
  }
  // The forward temple never grows a raised fin above the brow.
  const front=unifiedHelmetEarVerticalProfile(id,shoulder,hem[1][1],hem[1][2]);
  assert.ok(front.faceTopY<=hem[1][1]+.22);
  assert.ok(front.onsetY-front.faceTopY<.20);
 }
});
test('H28: cloth and trim inherit the same silhouette, no extra geometry systems',()=>{
 for(const id of cuts){
  const cover=createAchMichDrapedGeometry(id),
   fold=createAchMichDrapedGeometry(id,true),
   binding=createAchMichBindingGeometry(id);
  const shell=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial())
   .children[0].geometry;
  assert.equal(cover.userData.h28UnifiedEarProfileMatched,true);
  assert.equal(cover.getAttribute('position').count,cover.getAttribute('uv1').count);
  assert.ok(cover.boundingBox.max.x>=shell.boundingBox.max.x+
   ACH_MICH_COVER_OFFSET-.11,'fitted cloth clears exaggerated ear mass');
  assert.ok(binding.getAttribute('position').count>0);
  assert.ok(fold.getAttribute('position').count>35);
 }
});
