import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {UNIFIED_HELMET_HEMS,UNIFIED_HELMET_EAR_SHOULDERS,
 ACH_MICH_EAR_SHOULDER_FRACTION,ACH_MICH_EAR_FACE_TOP_FRACTION,
 ACH_MICH_EAR_FACE_BOTTOM_FRACTION,unifiedHelmetEarVerticalProfile}
 from '../src/operator-ach-mich-unified-shell.ts';
import {createHeadwearSilhouette,headwearCuboidVolumes,ACH_MICH_BEVEL_HEIGHT}
 from '../src/operator-headwear-silhouettes.ts';
import {createAchMichDrapedGeometry,ACH_MICH_COVER_OFFSET}
 from '../src/operator-ach-mich-cover-drape.ts';
import {createAchMichRetentionGeometry,ACH_MICH_CHIN_STRAP_HALF_WIDTH}
 from '../src/operator-ach-mich-details.ts';
const ids=['ach','mich-2002','mich-2001'];
const near=(a,b,eps=.015)=>Math.abs(a-b)<=eps;
const v=(attr,i)=>new THREE.Vector3(attr.getX(i),attr.getY(i),attr.getZ(i));
test('H27: full/mid have long protective faces, short bevel and no spikes',()=>{
 for(const id of ids){
  const hem=UNIFIED_HELMET_HEMS[id],widths=UNIFIED_HELMET_EAR_SHOULDERS[id],
   crown=headwearCuboidVolumes(id)[0];
  const shoulder=crown.y+crown.height/2-ACH_MICH_BEVEL_HEIGHT;
  const geom=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial()).children[0].geometry;
  if(id!=='mich-2001'){
   const frontProfile=unifiedHelmetEarVerticalProfile(id,shoulder,hem[1][1]);
   assert.ok(frontProfile.faceTopY<=hem[1][1]+.25,
    'ear guard must NOT produce upward spike beside brow-to-ear transition');
   assert.ok(frontProfile.faceBottomY>hem[1][1],
    'ear guard stays above the front local hem');
   assert.equal(geom.userData.h27BrowSpikeClamp,true);
  }
  const p=geom.getAttribute('position'),max=Math.max(...widths);
  assert.equal(hem.length,6);
  assert.equal(geom.userData.exteriorQuads,id==='mich-2001'?39:59);
  assert.ok(geom.boundingBox.max.x<=max+.001);
  if(id==='mich-2001'){
   assert.ok(widths.every(x=>near(x,hem[0][0])));
   continue;
  }
  for(const station of [2,3]){
   const y=hem[station][1],z=hem[station][2];
   const onsetY=shoulder+(y-shoulder)*ACH_MICH_EAR_SHOULDER_FRACTION;
   const faceTop=shoulder+(y-shoulder)*ACH_MICH_EAR_FACE_TOP_FRACTION;
   const faceBottom=shoulder+(y-shoulder)*ACH_MICH_EAR_FACE_BOTTOM_FRACTION;
   assert.ok(onsetY-faceTop>0.5);
   assert.ok(faceTop-faceBottom>0.9,'broad wall rather than a thin ridge');
   let foundOnset=false,foundUpper=false,foundLower=false;
   for(let i=0;i<p.count;i++)if(near(p.getZ(i),z)){
    foundOnset ||= near(p.getY(i),onsetY)&&near(Math.abs(p.getX(i)),hem[0][0]);
    foundUpper ||= near(p.getY(i),faceTop)&&near(Math.abs(p.getX(i)),widths[station]);
    foundLower ||= near(p.getY(i),faceBottom)&&near(Math.abs(p.getX(i)),widths[station]);
   }
   assert.ok(foundOnset&&foundUpper&&foundLower,id+' integrated plateau not present');
  }
  // The two triangles that form each main broad wall quad are coplanar;
  // an invisible diagonal should not form a dark triangular shading seam.
  for(const side of [0,1])for(let segment=0;segment<5;segment++){
   const q=4+side*26+segment*5,k=q*6;
   const a=v(p,k),b=v(p,k+1),c=v(p,k+2),d=v(p,k+5);
   const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
   assert.ok(normal.lengthSq()>.95);
   assert.ok(Math.abs(normal.dot(d.clone().sub(a)))<.02,
    id+' main ear panel must be planar');
  }
 }
});
test('H27: strips are true rectangles, not pinched Y-junction triangles',()=>{
 for(const id of ids){
  const geometry=createAchMichRetentionGeometry(id),p=geometry.getAttribute('position');
  assert.equal(p.count,54);
  assert.equal(geometry.userData.h27RectangularStraightWebbing,true);
  for(let k=0;k<48;k+=6){
   const a=v(p,k),b=v(p,k+1),c=v(p,k+2),d=v(p,k+5);
   const width=ACH_MICH_CHIN_STRAP_HALF_WIDTH*2;
   assert.ok(near(a.distanceTo(b),width,.002));
   assert.ok(near(c.distanceTo(d),width,.002));
   const sideOne=d.clone().sub(a),sideTwo=c.clone().sub(b);
   assert.ok(sideOne.distanceTo(sideTwo)<.003,
    'both long edges must be parallel and equal, not a shear');
   const area=b.clone().sub(a).cross(c.clone().sub(a)).length()/2;
   assert.ok(area>.01);
   assert.ok(Math.abs(b.clone().sub(a).dot(sideOne))<.003,
    'ribbon width must be perpendicular to straight run');
  }
 }
});
test('H27: fitted cover follows both ear-face levels and retains underfold',()=>{
 for(const id of ids){
  const cover=createAchMichDrapedGeometry(id),
   fold=createAchMichDrapedGeometry(id,true);
  const pos=cover.getAttribute('position'),hem=UNIFIED_HELMET_HEMS[id],
   width=UNIFIED_HELMET_EAR_SHOULDERS[id];
  assert.equal(cover.userData.h27BroadEarFaceMatched,true);
  assert.equal(cover.userData.h27BrowSpikeClampMatched,true);
  assert.equal(cover.getAttribute('uv1').count,pos.count);
  assert.ok(fold.getAttribute('position').count>35);
  if(id==='mich-2001')continue;
  const crown=headwearCuboidVolumes(id)[0];
  const shoulder=crown.y+crown.height/2-ACH_MICH_BEVEL_HEIGHT;
  for(const index of [2,3]){
   const z=hem[index][2],bottom=hem[index][1];
   for(const fraction of [ACH_MICH_EAR_FACE_TOP_FRACTION,
    ACH_MICH_EAR_FACE_BOTTOM_FRACTION]){
    const y=shoulder+(bottom-shoulder)*fraction+.07;
    let exposed=false;
    for(let j=0;j<pos.count;j++)
     if(near(pos.getZ(j),z)&&near(pos.getY(j),y)&&
      pos.getX(j)>=width[index]+ACH_MICH_COVER_OFFSET+.065)exposed=true;
    assert.ok(exposed,id+' fabric must clear both edges of the ear wall');
   }
  }
 }
});
