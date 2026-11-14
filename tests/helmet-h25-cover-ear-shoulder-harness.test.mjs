import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {UNIFIED_HELMET_HEMS,UNIFIED_HELMET_EAR_SHOULDERS,
 ACH_MICH_EAR_SHOULDER_FRACTION,unifiedHelmetEarShoulderWidth}
 from '../src/operator-ach-mich-unified-shell.ts';
import {createHeadwearSilhouette,headwearCuboidVolumes,ACH_MICH_BEVEL_HEIGHT}
 from '../src/operator-headwear-silhouettes.ts';
import {createAchMichDrapedGeometry,ACH_MICH_COVER_OFFSET}
 from '../src/operator-ach-mich-cover-drape.ts';
import {achMichProfile,createAchMichDetails,
 achMichRetentionPaths,createAchMichRetentionGeometry,
 updateAchMichDetails} from '../src/operator-ach-mich-details.ts';
const ids=['ach','mich-2002','mich-2001'];
const near=(a,b,t=.012)=>Math.abs(a-b)<t;
test('H25: visible outward ear shoulder begins halfway down the actual sidewall',()=>{
 const max=[5.80,5.74,5.60];
 for(let n=0;n<ids.length;n++){
  const id=ids[n],hem=UNIFIED_HELMET_HEMS[id],
   widths=UNIFIED_HELMET_EAR_SHOULDERS[id];
  const crown=headwearCuboidVolumes(id)[0];
  const shoulderY=crown.y+crown.height/2-ACH_MICH_BEVEL_HEIGHT;
  assert.equal(hem.length,6);
  assert.equal(widths.length,6);
  assert.ok(near(widths[2],max[n]));
  assert.ok(near(widths[3],max[n]));
  assert.ok(near(widths[0],hem[0][0]));
  assert.ok(widths[2]-widths[0]>.55,
   'not the tiny H24 lip-only bulge');
  assert.ok(near(ACH_MICH_EAR_SHOULDER_FRACTION,.52));
  const splitY=shoulderY+(hem[2][1]-shoulderY)*ACH_MICH_EAR_SHOULDER_FRACTION;
  const shell=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  const g=shell.children[0].geometry,p=g.getAttribute('position');
  assert.equal(g.userData.exteriorQuads,39,'only 10 static quads added');
  assert.equal(g.index.count,234,'78 triangles, same single shell draw call');
  assert.equal(shell.children.length,1);
  let left=false,right=false;
  for(let i=0;i<p.count;i++)if(
   near(p.getZ(i),hem[2][2])&&near(p.getY(i),splitY)){
    left ||= near(p.getX(i),-max[n]);
    right ||= near(p.getX(i),max[n]);
  }
  assert.ok(left&&right,id+' bulge exists at MIDHEIGHT on both sides');
  assert.ok(near(unifiedHelmetEarShoulderWidth(id,hem[2][2]),max[n]));
  assert.ok(near(g.boundingBox.max.x,max[n]));
 }
});
test('H25: fitted cover passes outside real ear shoulder and wraps below molded edge',()=>{
 for(const id of ids){
  const hem=UNIFIED_HELMET_HEMS[id],
   widths=UNIFIED_HELMET_EAR_SHOULDERS[id];
  const cover=createAchMichDrapedGeometry(id),
   fold=createAchMichDrapedGeometry(id,true);
  const pos=cover.getAttribute('position');
  for(const index of [2,3]){
   const z=hem[index][2];
   let found=false;
   for(let i=0;i<pos.count;i++)
    if(near(pos.getZ(i),z)&&
       pos.getX(i)>=widths[index]+ACH_MICH_COVER_OFFSET+.065)
       found=true;
   assert.ok(found,id+' cloth has a shaped outward ring over bulge');
  }
  // The main drape ends BELOW the bare shell lip, rather than at its
  // upper boundary where H24 left a visible stripe.
  for(const index of [2,3]){
   const z=hem[index][2];
   let hemOutside=false;
   for(let i=0;i<pos.count;i++)
    if(near(pos.getZ(i),z)&&near(pos.getY(i),hem[index][1]-.14))
     hemOutside=true;
   assert.ok(hemOutside,id+' outer fabric covers the complete lower lip');
  }
  assert.equal(cover.userData.h25EarShoulderMatched,true);
  assert.equal(cover.userData.h25TuckedConcealedBinding,true);
  assert.equal(fold.userData.h25TuckedConcealedBinding,true);
  assert.ok(fold.getAttribute('position').count>=42);
  // Verify cover material coordinates remain present for camouflage atlas.
  assert.equal(pos.count,cover.getAttribute('uv1').count);
  const layers=createAchMichDetails(new THREE.Group(),id);
  updateAchMichDetails(layers,true,true);
  assert.equal(layers.bare.visible,false);
  assert.equal(layers.coveredLiner.visible,true);
  assert.equal(layers.hardware.visible,false);
  updateAchMichDetails(layers,false,true);
  assert.equal(layers.bare.visible,true);
 }
});
test('H25: chinstrap three-way cheek joint has no overlapping full-width caps',()=>{
 for(const id of ids){
  const paths=achMichRetentionPaths(id),g=createAchMichRetentionGeometry(id),
   a=g.getAttribute('position');
  assert.equal(paths.length,6);
  assert.deepEqual(paths[0][1],paths[1][1]);
  assert.deepEqual(paths[0][1],paths[2][0]);
  assert.ok(paths[0][1][2]>-1,'actual junction is now beneath the ear');
  assert.ok(paths[0][1][0]<5&&paths[0][1][0]>4);
  assert.equal(a.count,36,'12 triangles incl cup vs 18 before');
  assert.equal(g.userData.h25SharedTaperedYJunction,true);
  // No degenerate faces, the three tapering bands meet at exactly one
  // authored point. A disconnected or overlapping cap is unnecessary.
  const p=i=>new THREE.Vector3(a.getX(i),a.getY(i),a.getZ(i));
  for(let i=0;i<a.count;i+=3){
   const area=p(i+1).sub(p(i)).cross(p(i+2).sub(p(i))).length()/2;
   assert.ok(area>.001,'no zero-area triangle');
  }
 }
});
