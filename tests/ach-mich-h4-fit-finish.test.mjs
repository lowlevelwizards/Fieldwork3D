import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ACH_MICH_SHELLS,headwearCuboidVolumes,createHeadwearSilhouette,
 ACH_MICH_UPPER_INSET,ACH_MICH_BEVEL_HEIGHT}
 from '../src/operator-headwear-silhouettes.ts';
import {achMichProfile,createAchMichDetails,createAchMichRetentionGeometry,
 createAchMichBindingGeometry,ACH_MICH_BINDING_HEIGHT}
 from '../src/operator-ach-mich-details.ts';
import {createAchMichDrapedGeometry} from '../src/operator-ach-mich-cover-drape.ts';
import {PASGT_UV_TEXELS_PER_UNIT}
 from '../src/operator-pasgt-drape-geometry.ts';
import {pasgtCamoWorldPeriod} from '../src/operator-pasgt-cover-texture.ts';
import {FABRIC_CAMO_DENSITY,fabricCamoWorldPeriod}
 from '../src/operator-fabric-camo-materials.ts';
import {HEADWEAR_DETAIL_PIXEL_WORLD_SIZE}
 from '../src/operator-headwear-materials.ts';
import {PIXEL_WORLD_SIZE} from '../src/rendering/pixel-recipes.ts';

const thresholds={
 ach:{frontY:4.9,rearZ:2.3},'mich-2001':{frontY:6.4,rearZ:4.0},
 'mich-2002':{frontY:5.2,rearZ:3.4}
};
test('H4 pronounced but localized crown chamfer is consistent across shell and drape',()=>{
 assert.ok(ACH_MICH_BEVEL_HEIGHT>=1.0);
 assert.ok(ACH_MICH_UPPER_INSET>=.5);
 for(const id of ACH_MICH_SHELLS){
  const shell=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  const geo=shell.children[0].geometry;
  const cover=createAchMichDrapedGeometry(id);
  assert.equal(geo.userData.achMichBevelHeight,ACH_MICH_BEVEL_HEIGHT);
  assert.ok(geo.boundingBox.max.y<cover.boundingBox.max.y);
  const roof=headwearCuboidVolumes(id)[0];
  assert.ok(roof.height>ACH_MICH_BEVEL_HEIGHT*2);
 }
});

test('H4 physical screws, binding and strap geometry stay coherent with each shell cut',()=>{
 assert.ok(ACH_MICH_BINDING_HEIGHT>=.55,'binding must be a readable surface');
 for(const id of ACH_MICH_SHELLS){
  const profile=achMichProfile(id);
  const t=thresholds[id];
  assert.ok(profile.frontStud[1]>=t.frontY,id+' forward anchor raised');
  assert.ok(profile.rearStud[2]<=t.rearZ,id+' rear anchor moved forward');
  assert.ok(profile.frontStud[0]>=profile.side,id+' screw seated on side');
  assert.ok(profile.rearStud[0]>=profile.side,id+' rear screw seated on side');
  assert.ok(profile.frontStud[2]<profile.rearStud[2]);
  const strap=createAchMichRetentionGeometry(id);
  const p=strap.getAttribute('position');
  assert.ok(strap.boundingBox.min.z<-4.85,'chin cup and strap sit ahead of face');
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   if(y>1.15&&z>-4.15&&z<1.9)
    assert.ok(Math.abs(x)>4.05,
     id+' strap clear of skull block at '+x+','+y+','+z);
  }
  const binding=createAchMichBindingGeometry(id);
  assert.ok(binding.getAttribute('position').count<1300,
   'large static profile; no tessellated small facets');
  const parent=new THREE.Group(),layers=createAchMichDetails(parent,id);
  assert.equal(layers.bindingMaterial.name,'ach-mich-color-related-shell-binding');
  assert.ok(layers.hardware.userData.achMichRetentionScrews===4);
 }
});

test('H4 ACH ear scallop remains distinct from nape and PASGT-style protective return',()=>{
 const v=headwearCuboidVolumes('ach');
 const ear=v.find(p=>p.name==='ach-right-ear-wrap');
 const nape=v.find(p=>p.name==='ach-right-nape-return');
 assert.ok(ear&&nape);
 assert.ok(ear.y-ear.height/2>=3.05);
 assert.ok(nape.y-nape.height/2<=2.7);
 assert.ok(nape.z-nape.depth/2<ear.z+ear.depth/2-.20,
  'joined protective volumes overlap without a floating corner');
 assert.ok(ear.depth>=5&&nape.depth>=2.5,
  'no tiny ear contour fragments');
});
test('H4 PASGT and ACH covers share uniform WORLD density, not an arbitrary rescale',()=>{
 assert.equal(HEADWEAR_DETAIL_PIXEL_WORLD_SIZE,PIXEL_WORLD_SIZE);
 for(const id of ['m81-woodland','three-color-desert','multicam',
  'ucp','woodland-marpat','flecktarn']){
  assert.ok(FABRIC_CAMO_DENSITY[id]>0);
  assert.equal(pasgtCamoWorldPeriod(id),fabricCamoWorldPeriod(id));
 }
 for(const id of ACH_MICH_SHELLS){
  const cover=createAchMichDrapedGeometry(id);
  assert.equal(cover.userData.uvTexelsPerUnit,PASGT_UV_TEXELS_PER_UNIT);
  assert.equal(cover.userData.printPanels.length,3);
 }
});
