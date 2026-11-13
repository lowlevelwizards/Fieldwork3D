import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeadwearSilhouette,headwearCuboidVolumes,
 ACH_MICH_SHELLS,ACH_MICH_UPPER_INSET,ACH_MICH_BEVEL_HEIGHT}
 from '../src/operator-headwear-silhouettes.ts';
import {ACH_MICH_CHIN_STRAP_HALF_WIDTH,ACH_MICH_BINDING_HEIGHT,
 achMichProfile,createAchMichDetails,createAchMichBindingGeometry,
 createAchMichRetentionGeometry,updateAchMichDetails}
 from '../src/operator-ach-mich-details.ts';
import {createAchMichDrapedGeometry}
 from '../src/operator-ach-mich-cover-drape.ts';
import {createModernHelmetCoverLayers,updateModernHelmetCoverLayers}
 from '../src/operator-helmet-cover-geometry.ts';
import {pasgtCoverTexture} from '../src/operator-pasgt-cover-texture.ts';
import {PASGT_UV_TEXELS_PER_UNIT}
 from '../src/operator-pasgt-drape-geometry.ts';
import {readHelmetSetup} from '../src/operator-helmet-setup-policy.ts';

test('H3 shell bevel modifies only the upper crown with finite broad facets',()=>{
 assert.ok(ACH_MICH_UPPER_INSET>=.25);
 assert.ok(ACH_MICH_BEVEL_HEIGHT>=.5);
 for(const id of ACH_MICH_SHELLS){
  const group=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  const geo=group.children[0].geometry;
  assert.equal(geo.userData.achMichBevelHeight,ACH_MICH_BEVEL_HEIGHT);
  const pos=geo.getAttribute('position'),norm=geo.getAttribute('normal');
  assert.ok(pos.count>30);
  assert.equal(pos.count,norm.count);
  let slopes=0;
  for(let i=0;i<norm.count;i++){
   for(const v of [norm.getX(i),norm.getY(i),norm.getZ(i)])
    assert.ok(Number.isFinite(v));
   const absY=Math.abs(norm.getY(i));
   if(absY>.05&&absY<.95)slopes++;
  }
  assert.ok(slopes>=6,id+' has a real, bounded top bevel');
 }
});

test('H3 physical hardware has meaningful graphic scale and shell anchors',()=>{
 assert.ok(ACH_MICH_BINDING_HEIGHT>=.35);
 assert.ok(ACH_MICH_CHIN_STRAP_HALF_WIDTH*2>=.8);
 for(const id of ACH_MICH_SHELLS){
  const prof=achMichProfile(id);
  assert.equal(prof.hem.length>=4,true);
  for(let i=1;i<prof.hem.length;i++)
   assert.ok(prof.hem[i][2]-prof.hem[i-1][2]>=.45,
    id+' must not generate sliver hem segments');
  const binding=createAchMichBindingGeometry(id);
  assert.ok(binding.boundingBox);
  assert.ok(binding.userData.segmentCount>=8);
  const harness=createAchMichRetentionGeometry(id);
  assert.ok(harness.getAttribute('position').count>40);
  const parent=new THREE.Group(),details=createAchMichDetails(parent,id);
  assert.equal(details.hardware.userData.achMichRetentionScrews,4);
  updateAchMichDetails(details,true,true);
  assert.equal(details.bare.visible,true);
  assert.equal(details.hardware.visible,false);
  assert.equal(details.strap.visible,true);
  updateAchMichDetails(details,false,false);
  assert.equal(details.hardware.visible,true);
  assert.equal(details.strap.visible,false);
 }
});

test('H3 ACH/MICH cover uses PASGT atlas pitch and fitted cloth rather than cuboid slabs',()=>{
 const original=pasgtCoverTexture('m81-woodland','same-texture',0);
 const tex=original.image.data;
 assert.equal(original.image.width,512);
 assert.equal(original.image.height,256);
 for(const id of ACH_MICH_SHELLS){
  const shell=headwearCuboidVolumes(id);
  const roof=shell[0].y+shell[0].height/2;
  const drape=createAchMichDrapedGeometry(id);
  const hem=createAchMichDrapedGeometry(id,true);
  const pos=drape.getAttribute('position'),uv=drape.getAttribute('uv1');
  assert.equal(drape.userData.achMichDrapedFabric,true);
  assert.equal(drape.userData.uvTexelsPerUnit,PASGT_UV_TEXELS_PER_UNIT);
  assert.equal(drape.userData.printPanels.length,3);
  assert.ok(drape.boundingBox.max.y>roof);
  assert.ok(drape.boundingBox.min.y>Math.min(...shell.map(p=>p.y-p.height/2)));
  assert.ok(hem.getAttribute('position').count>12);
  for(let i=0;i<pos.count;i++){
   const u=uv.getX(i),v=uv.getY(i);
   assert.ok(u>=0&&u<1&&v>=0&&v<1,id+' invalid UV');
   const x=Math.min(511,Math.max(0,Math.floor(u*512)));
   const y=Math.min(255,Math.max(0,Math.floor(v*256)));
   assert.equal(tex[(y*512+x)*4+3],255,id+' atlas gutter sample');
  }
  const root=new THREE.Group(),layers=createModernHelmetCoverLayers(root,id);
  updateModernHelmetCoverLayers(layers,id,readHelmetSetup({cover:'fitted'}),
   'm81-woodland','sample',0);
  assert.equal(layers.fitted.visible,true);
  assert.ok(layers.fitted.children.some(n=>n.name.includes('three-sewn-panel')));
  assert.equal(layers.fabric.vertexColors,false);
  assert.equal(layers.fabric.color.getHex(),0xffffff);
  assert.equal(layers.fabric.map?.image.width,512);
  updateModernHelmetCoverLayers(layers,id,readHelmetSetup({cover:'none'}),
   'm81-woodland','sample',0);
  assert.equal(layers.fitted.visible,false);
 }
});
