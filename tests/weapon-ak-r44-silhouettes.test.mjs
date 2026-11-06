import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS,FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setConfiguredFamilyPart,readWeaponConfiguration,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {partVisualBounds} from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {akBarrelArt} from '../src/weapons/geometry/ak-barrel-profiles.ts';
import {akMagazineCurve,akMagazineOutline,akMagazineWidthPoints,
 akMagazineRibOutlines} from '../src/weapons/geometry/ak-magazine-profiles.ts';
import {AK_PLUM_POLYMER} from '../src/weapons/geometry/weapon-visual-palette.ts';

const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const ids=['ak-akm','ak-akms','ak-ak74','ak-aks74','ak-ak74m',
 'ak-rpk74','ak-ak103','ak-aks74u','ak-ak105'];
function model(id){
 const preset=FAMILY_PRESETS.find(p=>p.id===id);
 assert.ok(preset,id+' preset');
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),id);
 const group=buildWeaponSilhouette(cfg.weapon,material,material,cfg);
 group.updateMatrixWorld(true);
 return {group,cfg,preset};
}
function bounds(group,slot){
 const box=partVisualBounds(group,slot);assert.ok(box,slot+' bounds');return box;
}
function slotMeshes(group,slot){
 return group.children.filter(x=>x.name.startsWith('family-'+slot+'-'));
}
test('R4.4 constant-normal-width ribbons rotate the toe without fanning',()=>{
 for(const style of ['762','545','rpk45']){
  const curve=akMagazineCurve(style);
  const outline=akMagazineOutline(curve);
  assert.ok(outline.length<=12&&outline.length>=8);
  for(const t of [0,.2,.4,.6,.8,1]){
   const [left,right]=akMagazineWidthPoints(curve,t);
   const width=Math.hypot(right[0]-left[0],right[1]-left[1]);
   assert.ok(Math.abs(width-3.05)<1e-8,style+' constant width at '+t);
  }
  const [bottomL,bottomR]=akMagazineWidthPoints(curve,1);
  assert.ok(bottomR[1]>bottomL[1]+.9,style+' diagonal toe');
 }
 const c762=akMagazineCurve('762'),c545=akMagazineCurve('545');
 assert.ok(akMagazineWidthPoints(c762,1)[1][1]-
  akMagazineWidthPoints(c762,1)[0][1]>1.35);
 assert.ok(c762.sweep>c545.sweep+.9);
});
test('R4.4 7.62 has exactly two curved 8-point ribs following centerline',()=>{
 const c=akMagazineCurve('762');
 const ribs=akMagazineRibOutlines(c);
 assert.equal(ribs.length,2);
 for(const rib of ribs){
  assert.equal(rib.length,8);
  assert.ok(rib[0][0]<rib[3][0]&&rib[0][1]>rib[3][1]);
 }
 assert.equal(akMagazineRibOutlines(akMagazineCurve('545')).length,0);
 assert.equal(akMagazineRibOutlines(akMagazineCurve('rpk45')).length,0);
 for(const id of ['ak-akm','ak-akms','ak-ak103']){
  const {group}=model(id);
  assert.equal(slotMeshes(group,'magazine').length,id==='ak-ak103'?1:3);
  assert.ok(bounds(group,'magazine').max.z-bounds(group,'magazine').min.z<=2.35);
  clearWeaponSilhouette(group);
 }
});
test('R4.4 all nine guns seat their fore-ends, use forward real iron sights and connect the gas system',()=>{
 for(const id of ids){
  const {group,preset,cfg}=model(id),art=akBarrelArt(preset.parts.barrel);
  const receiver=bounds(group,'receiver'),guard=bounds(group,'handguard');
  assert.ok(guard.min.x<receiver.max.x-.5,id+' fore-end tucked into receiver');
  assert.ok(receiver.intersectsBox(guard),id+' no handguard gap');
  assert.equal(slotMeshes(group,'handguard').length,
   preset.parts.handguard==='ak-rail-long'?4:3,id+' lower heel plus clean two-part fore-end');
  const barrel=slotMeshes(group,'barrel');
  assert.ok(barrel.length>=5,id+' has barrel, gas tube, block, sight and tip');
  const tube=new THREE.Box3().setFromObject(barrel[1]);
  const block=new THREE.Box3().setFromObject(barrel[2]);
  assert.ok(tube.intersectsBox(block),id+' gas block connected to tube');
  assert.ok(block.max.y>1.8&&block.min.y<0,id+' gas block joins barrel');
  const total=new THREE.Box3().setFromObject(group);
  assert.ok(Math.abs(total.max.x-art.muzzleX)<.001,id+' matches art muzzle');
  assert.ok(Math.abs(resolveWeaponAssembly(cfg).muzzleX-art.muzzleX)<.001,
   id+' shots match art endpoint');
  if(id!=='ak-aks74u'){
   const rear=slotMeshes(group,'receiver')[4];
   const sightBox=new THREE.Box3().setFromObject(rear);
   assert.ok(sightBox.min.x>2.3,id+' rear iron sight is at front of cover');
  }
  assert.ok(group.children.length<=28,id+' limited mesh count');
  clearWeaponSilhouette(group);
 }
});
test('R4.4 AK-105 is unmistakably between 74M and 74U in local length',()=>{
 const long=akBarrelArt('ak-long'),mid=akBarrelArt('ak-mid'),
  short=akBarrelArt('ak-short'),rpk=akBarrelArt('ak-rpk-long');
 assert.ok(long.muzzleX-mid.muzzleX>=3);
 assert.ok(mid.muzzleX-short.muzzleX>=2.5);
 assert.ok(rpk.muzzleX-long.muzzleX>=5);
 assert.ok(mid.frontSightX<long.frontSightX-1.4);
 const l=model('ak-ak74m'),m=model('ak-ak105'),s=model('ak-aks74u');
 assert.ok(bounds(l.group,'barrel').max.x>bounds(m.group,'barrel').max.x+3);
 assert.ok(bounds(m.group,'barrel').max.x>bounds(s.group,'barrel').max.x+2.5);
 for(const x of [l,m,s])clearWeaponSilhouette(x.group);
});
test('R4.4 AKMS underfolder really has Z-separated rails, AKS74 triangular negative space, preserved padded alternate',()=>{
 const akms=model('ak-akms'),aks=model('ak-aks74');
 const rails=slotMeshes(akms.group,'stock');
 assert.equal(rails.length,6);
 const positive=rails.filter(x=>x.position.z>.5),negative=rails.filter(x=>x.position.z<-.5);
 assert.equal(positive.length,2);
 assert.equal(negative.length,2);
 assert.equal(slotMeshes(aks.group,'stock').length,4);
 assert.ok(FAMILY_PARTS['ak-triangle-padded']);
 const change=setConfiguredFamilyPart(aks.cfg,'stock','ak-triangle-padded');
 assert.equal(change.build.parts.stock,'ak-triangle-padded');
 const recovered=readWeaponConfiguration(JSON.parse(JSON.stringify(change)),change.weapon);
 assert.equal(recovered.build.parts.stock,'ak-triangle-padded');
 for(const x of [akms,aks])clearWeaponSilhouette(x.group);
});
test('R4.4 AKM and AKMS stock presets have plum polymer grips',()=>{
 for(const id of ['ak-akm','ak-akms']){
  const {group,preset}=model(id);
  assert.equal(preset.parts.grip,'ak-grip-poly-plum');
  assert.equal(slotMeshes(group,'grip')[0].material,AK_PLUM_POLYMER);
  clearWeaponSilhouette(group);
 }
});
