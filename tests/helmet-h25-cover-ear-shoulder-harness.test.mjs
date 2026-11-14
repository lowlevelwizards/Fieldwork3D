import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {UNIFIED_HELMET_HEMS,UNIFIED_HELMET_EAR_SHOULDERS,
 ACH_MICH_LOWER_EDGE_RETURN_HEIGHT,unifiedHelmetEarShoulderWidth} from '../src/operator-ach-mich-unified-shell.ts';
import {createHeadwearSilhouette,headwearCuboidVolumes,ACH_MICH_BEVEL_HEIGHT}
 from '../src/operator-headwear-silhouettes.ts';
import {createAchMichDrapedGeometry,ACH_MICH_COVER_OFFSET}
 from '../src/operator-ach-mich-cover-drape.ts';
import {achMichProfile,createAchMichDetails,
 achMichRetentionPaths,createAchMichRetentionGeometry,
 ACH_MICH_CHIN_STRAP_HALF_WIDTH,
 updateAchMichDetails} from '../src/operator-ach-mich-details.ts';
const ids=['ach','mich-2002','mich-2001'];
const near=(a,b,t=.012)=>Math.abs(a-b)<t;
test('H29: no ear extrusion, contour alone drives width and sidewall',()=>{
 for(const id of ids){
  const hem=UNIFIED_HELMET_HEMS[id],widths=UNIFIED_HELMET_EAR_SHOULDERS[id];
  assert.equal(hem.length,6);
  assert.deepEqual(widths,hem.map(p=>p[0]),'no independently authored crest');
  const shell=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  const g=shell.children[0].geometry,p=g.getAttribute('position');
  assert.equal(shell.children.length,1);
  assert.equal(g.userData.exteriorQuads,39);
  assert.equal(g.index.count,234);
  assert.equal(g.userData.h29NoEarExtrusion,true);
  assert.equal(g.userData.h29LowerReturnHeight,ACH_MICH_LOWER_EDGE_RETURN_HEIGHT);
  for(const station of [1,2,3,4]){
   const [x,y,z]=hem[station];
   for(const sign of [-1,1]){
    let atHem=false,aboveHem=false;
    for(let i=0;i<p.count;i++)if(near(p.getZ(i),z)){
     atHem ||= near(p.getX(i),sign*x)&&near(p.getY(i),y);
     aboveHem ||= near(p.getX(i),sign*hem[0][0])&&
      near(p.getY(i),y+ACH_MICH_LOWER_EDGE_RETURN_HEIGHT);
    }
    assert.ok(atHem&&aboveHem,id+' short lower return integrates silhouette');
   }
  }
  assert.ok(near(unifiedHelmetEarShoulderWidth(id,hem[2][2]),hem[2][0]));
 }
});
test('H29: fitted cover wraps the contour and conceals the molded edge',()=>{
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
  assert.equal(cover.userData.h29ContourDrivenCover,true);


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
test('H26: chinstrap stays full-width through every three-way junction',()=>{
 for(const id of ids){
  const paths=achMichRetentionPaths(id),g=createAchMichRetentionGeometry(id),
   a=g.getAttribute('position');
  assert.equal(paths.length,6);
  assert.deepEqual(paths[0][1],paths[1][1]);
  assert.deepEqual(paths[0][1],paths[2][0]);
  assert.ok(paths[0][1][2]>-1,'actual junction is now beneath the ear');
  assert.ok(Math.abs(paths[0][1][0])<5&&Math.abs(paths[0][1][0])>4);
  assert.equal(a.count,54,'16 ribbon triangles and 2 chin-cup triangles');
  assert.equal(g.userData.h26FullWidthYJunction,true);
  assert.equal(g.userData.h25SharedTaperedYJunction,false);
  for(let q=0;q<48;q+=6){
   const p=k=>new THREE.Vector3(a.getX(k),a.getY(k),a.getZ(k));
   assert.ok(near(p(q).distanceTo(p(q+1)),ACH_MICH_CHIN_STRAP_HALF_WIDTH*2,.005));
   assert.ok(near(p(q+2).distanceTo(p(q+5)),ACH_MICH_CHIN_STRAP_HALF_WIDTH*2,.005));
  }
  // No degenerate faces or overlapping triangular cap at the Y junction.
  const p=i=>new THREE.Vector3(a.getX(i),a.getY(i),a.getZ(i));
  for(let i=0;i<a.count;i+=3){
   const area=p(i+1).sub(p(i)).cross(p(i+2).sub(p(i))).length()/2;
   assert.ok(area>.001,'no zero-area triangle');
  }
 }
});
