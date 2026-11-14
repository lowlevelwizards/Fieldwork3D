import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {UNIFIED_HELMET_HEMS,ACH_MICH_LOWER_EDGE_RETURN_HEIGHT}
 from '../src/operator-ach-mich-unified-shell.ts';
import {createHeadwearSilhouette} from '../src/operator-headwear-silhouettes.ts';
import {createAchMichDrapedGeometry} from '../src/operator-ach-mich-cover-drape.ts';
import {createAchMichRetentionGeometry,ACH_MICH_CHIN_STRAP_HALF_WIDTH}
 from '../src/operator-ach-mich-details.ts';
const ids=['ach','mich-2002','mich-2001'];
const near=(a,b,eps=.015)=>Math.abs(a-b)<=eps;
const v=(attr,i)=>new THREE.Vector3(attr.getX(i),attr.getY(i),attr.getZ(i));
test('H29: full/mid/high shell side panels stay planar, no triangular fins',()=>{
 for(const id of ids){
  const geo=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial())
   .children[0].geometry,p=geo.getAttribute('position');
  const hem=UNIFIED_HELMET_HEMS[id],sideX=hem[0][0];
  assert.equal(geo.userData.exteriorQuads,39);
  assert.equal(geo.userData.h29ContourDrivenShell,true);
  // Each broad side face is a planar quad at the crown's own width.
  for(const side of [0,1])for(let segment=0;segment<5;segment++){
   const q=(side===0?2:18)+segment*3,k=q*6;
   for(let n=0;n<6;n++)
    assert.ok(near(Math.abs(p.getX(k+n)),sideX,.002),
     id+' must not extrude a triangular lateral ear panel');
  }
  assert.ok(id==='mich-2001'?hem[2][1]>hem[1][1]:
   hem[2][1]<hem[1][1],'cut-specific ear silhouette is preserved');
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
test('H29: fitted cover follows the same short lower return',()=>{
 for(const id of ids){
  const cover=createAchMichDrapedGeometry(id),
   fold=createAchMichDrapedGeometry(id,true);
  const pos=cover.getAttribute('position'),hem=UNIFIED_HELMET_HEMS[id];
  assert.equal(cover.userData.h29ContourDrivenCover,true);
  assert.equal(cover.userData.h29LowerReturnHeight,ACH_MICH_LOWER_EDGE_RETURN_HEIGHT);
  assert.equal(cover.getAttribute('uv1').count,pos.count);
  assert.ok(fold.getAttribute('position').count>35);
  for(const station of [2,3]){
   const y=hem[station][1]+ACH_MICH_LOWER_EDGE_RETURN_HEIGHT+.07;
   let found=false;
   for(let i=0;i<pos.count;i++)
    found ||= near(pos.getZ(i),hem[station][2])&&near(pos.getY(i),y);
   assert.ok(found,id+' cloth must touch the lower return ring');
  }
 }
});
