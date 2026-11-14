import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {UNIFIED_HELMET_HEMS} from '../src/operator-ach-mich-unified-shell.ts';
import {createHeadwearSilhouette} from '../src/operator-headwear-silhouettes.ts';
import {achMichProfile,achMichHemY,achMichBindingHeight,
 createAchMichBindingGeometry,achMichRetentionPaths,createAchMichDetails}
 from '../src/operator-ach-mich-details.ts';
import {createAchMichDrapedGeometry,ACH_MICH_COVER_OFFSET}
 from '../src/operator-ach-mich-cover-drape.ts';
const ids=['ach','mich-2002','mich-2001'];
const near=(a,b,t=.008)=>Math.abs(a-b)<=t;
const point=(attr,i)=>[attr.getX(i),attr.getY(i),attr.getZ(i)];
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);

test('H24: mirrored per-station ear mass, not extra shell parts',()=>{
 const levels=ids.map(id=>UNIFIED_HELMET_HEMS[id]);
 assert.ok(levels[0][2][0]-levels[0][0][0]>=.25,'Full ear bulges more');
 assert.ok(levels[1][2][0]-levels[1][0][0]>=.22,'Mid ear bulges');
 assert.ok(levels[2][2][0]-levels[2][0][0]>=.10,'High upper shell has mild width');
 assert.ok(levels[0][2][0]-levels[0][0][0]>
  levels[1][2][0]-levels[1][0][0]);
 assert.ok(levels[1][2][0]-levels[1][0][0]>
  levels[2][2][0]-levels[2][0][0]);
 for(const id of ids){
  const hem=UNIFIED_HELMET_HEMS[id],mat=new THREE.MeshStandardMaterial();
  const shell=createHeadwearSilhouette(id,mat);
  const mesh=shell.children[0],geo=mesh.geometry;
  assert.equal(shell.children.length,1);
  assert.equal(geo.index.count,234,'78 triangles; one added shoulder row');
  assert.equal(geo.userData.exteriorQuads,39);
  assert.equal(mesh.castShadow,true);
  assert.equal(mesh.material.side,THREE.DoubleSide);
  assert.equal(mesh.material.shadowSide,THREE.DoubleSide);
  assert.equal(mesh.material,mat,'visible shell must track dynamic swatch updates');
  assert.equal(mat.side,THREE.DoubleSide);
  assert.equal(mat.shadowSide,THREE.DoubleSide);
  const pos=geo.getAttribute('position');
  const xCoords=new Set();
  for(let i=0;i<pos.count;i++)
   if(near(pos.getY(i),hem[2][1],.0001)&&near(pos.getZ(i),hem[2][2],.0001))
    xCoords.add(Math.round(pos.getX(i)*1000)/1000);
  assert.ok(xCoords.has(hem[2][0])&&xCoords.has(-hem[2][0]),
   'side geometry mirrors the same actual lower side width');
  const cover=createAchMichDrapedGeometry(id);
  assert.ok(cover.boundingBox.max.x>=geo.boundingBox.max.x+ACH_MICH_COVER_OFFSET-.11,
   'fabric retains clearance from side bulge');
 }
});
test('H24: rubber lip maintains perpendicular visual width even on diagonals',()=>{
 for(const id of ids){
  const g=createAchMichBindingGeometry(id),
   p=g.getAttribute('position'),height=achMichBindingHeight(id);
  assert.equal(p.count,72);
  assert.equal(g.userData.segmentCount,12);
  // Layout is 2 face strips + five left + five right, six vertices each.
  for(const seg of [2,3,4,5,6,7,8,9,10,11]){
   const k=seg*6,loA=point(p,k),loB=point(p,k+1),
    upB=point(p,k+2),upA=point(p,k+5),
    dy=loB[1]-loA[1],dz=loB[2]-loA[2],
    len=Math.hypot(dy,dz);
   assert.ok(len>.1);
   const ny=dz/len,nz=-dy/len;
   for(const [lo,up] of [[loA,upA],[loB,upB]]){
    assert.ok(near((up[1]-lo[1])*ny+(up[2]-lo[2])*nz,height,.003),
     id+' band width measured perpendicular to side contour, not vertical');
    assert.ok(near(up[0],lo[0]),'no sideways flare from rubber lip');
   }
  }
  // Exact shared corners of all twelve perimeter segments.
  for(const [a,b] of [[0,12],[1,42],[7,37],[6,67],
   [5,17],[2,47],[11,68],[8,38]])
   assert.ok(dist(point(p,a),point(p,b))<.005,
    'front/rear upper and lower corner matches side exactly');
 }
});
test('H24: rearward partial/open ears and deeper protected nape stay separate',()=>{
 const f=UNIFIED_HELMET_HEMS.ach,m=UNIFIED_HELMET_HEMS['mich-2002'],
  h=UNIFIED_HELMET_HEMS['mich-2001'];
 assert.deepEqual([f[5][1],m[5][1],h[5][1]],[1.85,1.90,2.05]);
 assert.deepEqual([f[2][1],m[2][1],h[2][1]],[2.04,3.06,5.30]);
 for(const hem of [m,h]){
  const fraction=(hem[1][2]-hem[0][2])/(hem[5][2]-hem[0][2]);
  assert.ok(fraction>.42&&fraction<.45,'longer front temple');
  assert.ok(hem[2][2]>0,'ear opening moves rearward');
  assert.ok(hem[4][1]<hem[3][1],'rear guards nape below ear relief');
 }
 assert.ok(h[3][1]-h[5][1]>3.2);
});
test('H24: screws are paired, symmetric, above lip and seated on shell',()=>{
 for(const id of ids){
  const p=achMichProfile(id),rim=achMichBindingHeight(id);
  assert.ok(near(p.frontStud[2],p.hem[1][2]-.32));
  assert.ok(near(p.rearStud[2],p.hem[4][2]+.36));
  assert.ok(p.rearStud[2]<p.rear-.25);
  for(const bolt of [p.frontStud,p.rearStud]){
   assert.ok(near(bolt[1]-achMichHemY(id,bolt[2]),rim+.45),
    'screw center has constant clearance over whole rubber rim');
   assert.ok(bolt[1]-.26>achMichHemY(id,bolt[2])+rim+.15,
    'screw body entirely above lip with spacing');
  }
  const parent=new THREE.Group(),layers=createAchMichDetails(parent,id);
  const screws=[];
  layers.hardware.traverse(node=>{
   if(node instanceof THREE.Mesh)screws.push(node);
  });
  assert.ok(screws.length>=1,'hardware stays static mesh-batched');
  const paths=achMichRetentionPaths(id);
  assert.equal(paths.length,6);
  for(let j=0;j<3;j++){
   const left=paths[j],right=paths[j+3];
   assert.equal(left.length,right.length);
   for(let k=0;k<left.length;k++){
    assert.ok(near(left[k][0],-right[k][0]));
    assert.ok(near(left[k][1],right[k][1]));
    assert.ok(near(left[k][2],right[k][2]));
   }
  }
 }
});
