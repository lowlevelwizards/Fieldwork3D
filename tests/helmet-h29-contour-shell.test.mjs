import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {UNIFIED_HELMET_HEMS,ACH_MICH_LOWER_EDGE_RETURN_HEIGHT,
 UNIFIED_HELMET_EAR_SHOULDERS}
 from '../src/operator-ach-mich-unified-shell.ts';
import {createHeadwearSilhouette,ACH_MICH_BEVEL_HEIGHT}
 from '../src/operator-headwear-silhouettes.ts';
import {createAchMichDrapedGeometry,ACH_MICH_COVER_OFFSET}
 from '../src/operator-ach-mich-cover-drape.ts';
import {createAchMichBindingGeometry,achMichProfile}
 from '../src/operator-ach-mich-details.ts';
const ids=['ach','mich-2002','mich-2001'],eps=.015;
const near=(a,b,t=eps)=>Math.abs(a-b)<t;
const at=(p,i)=>[p.getX(i),p.getY(i),p.getZ(i)];
test('H29: all three helmets use a single planar sidewall and 0.34 lower turn',()=>{
 for(const id of ids){
  const hem=UNIFIED_HELMET_HEMS[id],s=hem[0][0];
  const shell=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  const geo=shell.children[0].geometry,p=geo.getAttribute('position');
  assert.equal(shell.children.length,1);
  assert.equal(geo.userData.exteriorQuads,39);
  assert.equal(geo.index.count,234);
  assert.equal(geo.userData.h29NoEarExtrusion,true);
  assert.equal(geo.userData.h29ContourDrivenShell,true);
  assert.equal(geo.userData.h29LowerReturnHeight,ACH_MICH_LOWER_EDGE_RETURN_HEIGHT);
  assert.deepEqual(UNIFIED_HELMET_EAR_SHOULDERS[id],hem.map(h=>h[0]));
  for(const side of [0,1])for(let segment=0;segment<5;segment++){
   const mainQuad=2+side*16+segment*3,base=mainQuad*6;
   for(let k=0;k<6;k++)assert.ok(near(Math.abs(p.getX(base+k)),s,.003),
    'upper and entire ear-cover main wall share one exact side plane');
   const lowerQuad=base+6,lowA=hem[segment],lowB=hem[segment+1];
   const yValues=new Set();
   for(let k=0;k<6;k++)yValues.add(Math.round(p.getY(lowerQuad+k)*1000));
   assert.ok(yValues.has(Math.round((lowA[1]+ACH_MICH_LOWER_EDGE_RETURN_HEIGHT)*1000)));
   assert.ok(yValues.has(Math.round(lowB[1]*1000)));
   const width=Math.max(...hem.map(h=>h[0]))-s;
   assert.ok(width<=.30,'never create a broad lateral ear extrusion');
  }
  assert.ok(geo.boundingBox.max.x<=Math.max(...hem.map(h=>h[0]))+.001);
  assert.ok(geo.boundingBox.max.y>8.6);
  assert.ok(near(geo.userData.achMichBevelHeight,ACH_MICH_BEVEL_HEIGHT));
 }
});
test('H29: cut silhouette, rubber and cover all use same six points',()=>{
 const [full,mid,high]=ids.map(id=>UNIFIED_HELMET_HEMS[id]);
 assert.ok(full[2][1]<mid[2][1]&&mid[2][1]<high[2][1]);
 assert.ok(high[2][1]>high[1][1],'open ear arch stays negative space');
 for(const id of ids){
  const hem=UNIFIED_HELMET_HEMS[id],p=achMichProfile(id);
  assert.equal(p.hem,hem);
  const cover=createAchMichDrapedGeometry(id),
   fold=createAchMichDrapedGeometry(id,true),
   binding=createAchMichBindingGeometry(id);
  const pos=cover.getAttribute('position');
  assert.equal(cover.userData.h29ContourDrivenCover,true);
  assert.equal(cover.userData.h29LowerReturnHeight,ACH_MICH_LOWER_EDGE_RETURN_HEIGHT);
  assert.equal(pos.count,cover.getAttribute('uv1').count);
  assert.equal(binding.userData.segmentCount,12);
  assert.ok(fold.getAttribute('position').count>35);
  for(const n of [2,3]){
   const [x,y,z]=hem[n];
   let atReturn=false,atHem=false;
   for(let i=0;i<pos.count;i++){
    const [px,py,pz]=at(pos,i);
    atReturn ||= near(pz,z)&&near(py,y+ACH_MICH_LOWER_EDGE_RETURN_HEIGHT+.07)
     &&px>=hem[0][0]+ACH_MICH_COVER_OFFSET+.065;
    atHem ||=near(pz,z)&&near(py,y-.14)&&px>=x+ACH_MICH_COVER_OFFSET;
   }
   assert.ok(atReturn&&atHem,id+' cloth must follow return and conceal edge');
  }
 }
});
