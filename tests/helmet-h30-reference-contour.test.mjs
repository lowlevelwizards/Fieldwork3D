import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {UNIFIED_HELMET_HEMS,UNIFIED_HELMET_EAR_SHOULDERS,
 unifiedHelmetEarVerticalProfile,ACH_MICH_EAR_BROW_RELIEF,
 ACH_MICH_EAR_HEM_RETURN,ACH_MICH_EAR_UPPER_BEVEL_HEIGHT}
 from '../src/operator-ach-mich-unified-shell.ts';
import {createHeadwearSilhouette,headwearCuboidVolumes,ACH_MICH_BEVEL_HEIGHT}
 from '../src/operator-headwear-silhouettes.ts';
import {createAchMichDrapedGeometry} from '../src/operator-ach-mich-cover-drape.ts';
import {createAchMichRetentionGeometry} from '../src/operator-ach-mich-details.ts';
const cuts=['ach','mich-2002','mich-2001'];
const near=(a,b,e=.015)=>Math.abs(a-b)<=e;
test('H30: ref-informed brow/ear/nape profile is neither wedge nor slab',()=>{
 for(const id of cuts){
  const hem=UNIFIED_HELMET_HEMS[id],widths=UNIFIED_HELMET_EAR_SHOULDERS[id];
  assert.equal(hem.length,6);
  const mesh=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  const g=mesh.children[0].geometry;
  assert.equal(mesh.children.length,1);
  assert.equal(g.userData.exteriorQuads,id==='mich-2001'?39:59);
  assert.equal(g.userData.h30ReferenceContourCandidate,true);
  const crown=headwearCuboidVolumes(id)[0],
   shoulder=crown.y+crown.height/2-ACH_MICH_BEVEL_HEIGHT;
  const topAtEar=unifiedHelmetEarVerticalProfile(id,shoulder,hem[2][1],hem[2][2]);
  const topAtBrow=unifiedHelmetEarVerticalProfile(id,shoulder,hem[1][1],hem[1][2]);
  if(id==='mich-2001'){
   assert.ok(widths.every(x=>near(x,hem[0][0])));
   assert.ok(hem[2][1]>hem[1][1]+.7,'open ear arch');
   continue;
  }
  const outward=widths[2]-hem[0][0];
  assert.ok(outward>=.30&&outward<=.33,'protective face is molded into lower shell');
  assert.ok(outward<.40,'no outsized lateral add-on');
  assert.ok(topAtEar.faceTopY-topAtEar.faceBottomY>1.25,
   'substantial integrated ear coverage, not narrow triangular ridge');
  assert.ok(near(topAtEar.faceTopY,hem[1][1]+ACH_MICH_EAR_BROW_RELIEF));
  assert.ok(near(topAtEar.faceTopY,topAtBrow.faceTopY),
   'no long slanted top ridge across face');
  assert.ok(near(topAtEar.faceBottomY,hem[2][1]+ACH_MICH_EAR_HEM_RETURN));
  assert.ok(near(topAtEar.onsetY-topAtEar.faceTopY,ACH_MICH_EAR_UPPER_BEVEL_HEIGHT));
  assert.ok(topAtBrow.faceBottomY>hem[1][1]);
  assert.ok(g.boundingBox.max.x<hem[0][0]+.4);
 }
});
test('H30: fabric stays on the shell and straps are not rebuilt',()=>{
 for(const id of cuts){
  const cover=createAchMichDrapedGeometry(id),
   fold=createAchMichDrapedGeometry(id,true),
   strap=createAchMichRetentionGeometry(id);
  assert.equal(cover.userData.h30ReferenceContourCandidateMatched,true);
  assert.equal(cover.getAttribute('position').count,cover.getAttribute('uv1').count);
  assert.ok(fold.getAttribute('position').count>35);
  assert.equal(strap.getAttribute('position').count,54);
  assert.equal(strap.userData.h27RectangularStraightWebbing,true);
 }
});
