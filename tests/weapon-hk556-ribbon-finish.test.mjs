/** HK33/HK53 R2: AK-derived normal-offset ribbon, but HK-specific feed and art. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {akMagazineCurve,akMagazineSample,akMagazineWidthPoints}
 from '../src/weapons/geometry/ak-magazine-profiles.ts';
import {hk556MagazineCurve,hk556MagazineOutline,hk556MagazineRibOutlines,
 hk556MagazineHeelOutline,HK556_MAG_CENTER_X,HK556_MAG_LENGTHS}
 from '../src/weapons/geometry/hk-556-magazine-profiles.ts';
import {AK_MAG_RIB,HK556_MAG_METAL,HK556_MAG_RIB,HK_DARK_POLYMER,
 HK_OLIVE_POLYMER}
 from '../src/weapons/geometry/weapon-visual-palette.ts';
import {FAMILY_PRESETS,FAMILY_PARTS,compatibleFamilyPart}
 from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setConfiguredFamilyPart,readWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {carriedMagazineProfile,carriedMagazineGeometry}
 from '../src/operator-carried-magazines.ts';
const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
const factory=id=>{
 const p=FAMILY_PRESETS.find(x=>x.id===id);
 assert.ok(p);
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
 const group=buildWeaponSilhouette(p.weapon,steel,dark,config);
 return {config,group};
};
const tol=(a,b,t=.00001)=>Math.abs(a-b)<t;
test('HK magazines inherit AK normal-offset ribbon construction, but less sweep',()=>{
 const ak=akMagazineCurve('545');
 for(const id of ['hk556-mag25','hk556-mag30']){
  const c=hk556MagazineCurve(id);
  assert.ok(c.sweep>=.80&&c.sweep<=.90);
  assert.ok(c.sweep<ak.sweep,'less curved than an AK-74');
  assert.equal(c.topX,HK556_MAG_CENTER_X,'magwell feed unchanged');
  assert.equal(c.length,HK556_MAG_LENGTHS[id]);
  const shape=hk556MagazineOutline(id);
  assert.equal(shape.length,8,'4 ribbon samples, 8 corners, no micro detail');
  const stations=[0,.34,.68,1];
  for(let k=0;k<4;k++){
   const [left,right]=akMagazineWidthPoints(c,stations[k]);
   assert.ok(tol(shape[k][0],left[0])&&tol(shape[k][1],left[1]),
    'first side is exactly the AK normal-offset ribbon');
   const reverse=shape[shape.length-1-k];
   assert.ok(tol(reverse[0],right[0])&&tol(reverse[1],right[1]),
    'opposite side follows identical normals');
   assert.ok(tol(Math.hypot(right[0]-left[0],right[1]-left[1]),c.width),
    'constant ribbon cross-sectional width through curve');
  }
  const start=akMagazineSample(c,0),toe=akMagazineSample(c,1);
  assert.ok(toe.x-start.x>=.79&&toe.x-start.x<=.91,
   'visible HK lower sweep, 0.8–0.9 units');
  const ribs=hk556MagazineRibOutlines(id);
  assert.equal(ribs.length,2,'exactly two AK-family stamped rib silhouettes');
  for(const rib of ribs){
   assert.equal(rib.length,8,'four sections per rib');
   for(let i=0;i<4;i++)
    assert.ok(rib[i][1]>rib[i+4]?.[1]||i===0||rib[i][1]<0,
     'rib guide is a compact stamped side contour');
  }
  assert.equal(hk556MagazineHeelOutline(id).length,4,
   'heel follows toe as a single four-corner plate');
 }
 assert.equal(HK556_MAG_RIB,AK_MAG_RIB,'identical existing AK rib finish');
});
test('HK33 and HK53 bodies, two ribs and heel share one curved magazine',()=>{
 for(const id of ['hk-hk33a2','hk-hk53a3']){
  const {config,group}=factory(id);
  const body=group.children.filter(x=>x.userData.hk556RibbonBody);
  const ribs=group.children.filter(x=>x.userData.hk556StampedRib);
  const heel=group.children.filter(x=>x.userData.hk556Heel);
  assert.equal(body.length,1,id+' one ribbon body');
  assert.equal(ribs.length,2,id+' two longitudinal ribs');
  assert.equal(heel.length,1,id+' one angled heel');
  assert.equal(body[0].material,HK556_MAG_METAL);
  assert.ok(ribs.every(x=>x.material===AK_MAG_RIB&&!x.castShadow));
  const bodyZ=new THREE.Box3().setFromObject(body[0]);
  for(const rib of ribs){
   const ribZ=new THREE.Box3().setFromObject(rib);
   assert.ok(ribZ.max.z>bodyZ.max.z+.035);
   assert.ok(ribZ.min.z<bodyZ.min.z-.035);
  }
  const magId=config.build.parts.magazine;
  const carried=carriedMagazineProfile(magId);
  assert.equal(carried.length,HK556_MAG_LENGTHS[magId]);
  assert.equal(carried.material,0x515b53,'carried metal matches rifle');
  const geometry=carriedMagazineGeometry(magId);
  assert.ok(geometry.getAttribute('position').count>0);
  geometry.dispose();
  clearWeaponSilhouette(group);
 }
});
test('black factory models coexist with preserved OD green saved parts',()=>{
 const expected=[
  ['hk-hk33a2','hk33-fixed-stock-black','hk33-poly-slim-black'],
  ['hk-hk53a3','hk53-retract-stock','hk53-poly-short-black']
 ];
 for(const [id,stock,guard] of expected){
  const {config,group}=factory(id);
  assert.equal(config.build.parts.stock,stock);
  assert.equal(config.build.parts.handguard,guard);
  assert.equal(group.children.find(x=>x.name.startsWith('family-handguard-')).material,
   HK_DARK_POLYMER);
  if(id==='hk-hk33a2')
   assert.equal(group.children.find(x=>x.name.startsWith('family-stock-')
    &&x.name.endsWith('-0')).material,HK_DARK_POLYMER);
  clearWeaponSilhouette(group);
 }
 const {config}=factory('hk-hk33a2');
 const oldStock=setConfiguredFamilyPart(config,'stock','hk33-fixed-stock');
 const oldBoth=setConfiguredFamilyPart(oldStock,'handguard','hk33-poly-slim');
 assert.equal(oldBoth.build.parts.stock,'hk33-fixed-stock');
 assert.equal(oldBoth.build.parts.handguard,'hk33-poly-slim');
 assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(oldBoth)),
  oldBoth.weapon),oldBoth,'previous OD equipment save roundtrips');
 const group=buildWeaponSilhouette('rifle',steel,dark,oldBoth);
 assert.equal(group.children.find(x=>x.name.startsWith('family-stock-')).material,
  HK_OLIVE_POLYMER);
 assert.equal(group.children.find(x=>x.name.startsWith('family-handguard-')).material,
  HK_OLIVE_POLYMER);
 clearWeaponSilhouette(group);
 const h53=factory('hk-hk53a3').config;
 const oldGuard=setConfiguredFamilyPart(h53,'handguard','hk53-poly-short');
 const older=buildWeaponSilhouette('carbine',steel,dark,oldGuard);
 assert.equal(older.children.find(x=>x.name.startsWith('family-handguard-')).material,
  HK_OLIVE_POLYMER);
 clearWeaponSilhouette(older);
 for(const rec of ['hk33-556-rifle','hk53-556-compact'])
  assert.equal(compatibleFamilyPart(rec,'magazine','hk-g3-mag20',
   rec==='hk33-556-rifle'?'rifle':'carbine'),false);
});
test('only long HK33 fore-end has a stronger taper; compact HK53 stays chunky',()=>{
 const boundsAt=(group,x)=>{
  const mesh=group.children.find(m=>m.userData.hk556Forearm);
  const pos=mesh.geometry.getAttribute('position'),vals=[];
  for(let i=0;i<pos.count;i++)if(tol(pos.getX(i),x,.001))
   vals.push(Math.abs(pos.getZ(i)));
  return Math.max(...vals);
 };
 for(const [id,start,end,ratio] of [
  ['hk-hk33a2',4.05,13,.86],
  ['hk-hk53a3',4.05,9.25,.92]
 ]){
  const {group}=factory(id),front=boundsAt(group,end),back=boundsAt(group,start);
  assert.ok(tol(front/back,ratio,.0001),id+' taper is deliberate and unsegmented');
  clearWeaponSilhouette(group);
 }
});
