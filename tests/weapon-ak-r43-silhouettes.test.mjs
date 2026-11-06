import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS,FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {partVisualBounds}
 from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {AK_VISUAL_ANATOMY}
 from '../src/weapons/geometry/weapon-receiver-anatomy.ts';

const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const ids=['ak-akm','ak-akms','ak-ak74','ak-aks74','ak-ak74m',
 'ak-rpk74','ak-ak103','ak-aks74u','ak-ak105'];
function model(id){
 const preset=FAMILY_PRESETS.find(p=>p.id===id);
 assert.ok(preset,id+' must remain available');
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),id);
 const group=buildWeaponSilhouette(config.weapon,material,material,config);
 group.updateMatrixWorld(true);
 return {group,config,preset};
}
function bounds(group,slot){
 const b=partVisualBounds(group,slot);
 assert.ok(b,slot+' must remain present');
 return b;
}
function familyMesh(group,slot,id,index){
 const mesh=group.children.find(m=>m.name==='family-'+slot+'-'+id+'-'+index);
 assert.ok(mesh,slot+' '+id+' '+index);
 return mesh;
}
function rayHits(group,x,y){
 const ray=new THREE.Raycaster(new THREE.Vector3(x,y,24),
  new THREE.Vector3(0,0,-1));
 return ray.intersectObjects(group.children.filter(m=>!m.userData.weaponPixelArt),true)
  .length>0;
}
function rangeY(mesh){
 const b=new THREE.Box3().setFromObject(mesh);
 return b.max.y-b.min.y;
}
test('AK R4.3 retains nine recipes, authoritative contacts and compact mesh budget',()=>{
 assert.equal(FAMILY_PRESETS.filter(p=>p.family==='ak').length,9);
 assert.equal(Object.keys(FAMILY_PARTS).length,90);
 for(const id of ids){
  const {group,config}=model(id);
  const body=new THREE.Box3().setFromObject(group);
  assert.ok(Math.abs(body.max.x-resolveWeaponAssembly(config).muzzleX)<.001,
   id+' preserves fixed combat muzzle');
  assert.ok(group.children.length>=12&&group.children.length<=28,
   id+' silhouette mesh budget');
  for(const [a,b] of [
   ['stock','receiver'],['grip','receiver'],['magazine','receiver'],
   ['receiver','handguard'],['handguard','barrel']
  ]){
   assert.ok(bounds(group,a).intersectsBox(bounds(group,b)),
    id+' attached '+a+' to '+b);
  }
  clearWeaponSilhouette(group);
 }
});
test('AK R4.3 grips are seated farther back and standard furniture is abbreviated',()=>{
 assert.ok(AK_VISUAL_ANATOMY.gripShiftX<=-2);
 for(const id of ids){
  const {group}=model(id);
  const grip=bounds(group,'grip'),mag=bounds(group,'magazine');
  assert.ok(grip.max.x<mag.min.x-.2,id+' grip remains behind magazine');
  if(id!=='ak-aks74u'){
   const guard=bounds(group,'handguard');
   assert.ok(guard.max.x<=13.5,id+' keeps exposed barrel region');
  }
  clearWeaponSilhouette(group);
 }
});
test('AK R4.3 lower magazine edges have a deliberate tilted toe',()=>{
 for(const id of ids){
  const {group,preset}=model(id);
  const mag=familyMesh(group,'magazine',preset.parts.magazine,0);
  const a=mag.geometry.getAttribute('position'),low=new Set();
  for(let i=0;i<a.count;i++)
   if(a.getY(i)<-6)low.add(Math.round(a.getY(i)*100)/100);
  const ys=[...low].sort((a,b)=>a-b);
  assert.ok(ys.length>=2&&ys.at(-1)-ys[0]>.65,
   id+' magazine bottom edge must slant rather than appear horizontal');
  clearWeaponSilhouette(group);
 }
});
test('AK R4.3 AKMS forks are unlike the distinct AKS-74 triangle',()=>{
 const ms=model('ak-akms'),s=model('ak-aks74'),u=model('ak-aks74u');
 assert.equal(rayHits(ms.group,-9,-.72),false,'AKMS keeps open lower center');
 assert.equal(rayHits(s.group,-9,-.72),true,'AKS-74 has triangular diagonal');
 assert.equal(rayHits(u.group,-9.65,-1.05),false,'AKS-74U stock unchanged');
 assert.ok(ms.group.children.filter(m=>m.name.startsWith('family-stock-')).length>=4);
 assert.ok(s.group.children.filter(m=>m.name.startsWith('family-stock-')).length>=4);
 for(const m of [ms,s,u])clearWeaponSilhouette(m.group);
});
test('AK R4.3 RPK has bespoke clubfoot, long 45 round toe and bipod',()=>{
 const {group}=model('ak-rpk74');
 assert.ok(bounds(group,'stock').min.y<-4.0,'deep RPK clubfoot heel');
 assert.ok(bounds(group,'magazine').min.y<-9.3,'longer magazine');
 assert.ok(bounds(group,'handguard').max.x>13.2,'support fore-end is longer');
 assert.ok(group.children.filter(m=>m.name.startsWith('family-barrel-')).length>=6);
 clearWeaponSilhouette(group);
});
test('AK R4.3 muzzle silhouettes separate AKM, 74, RPK and 105 shapes',()=>{
 const sizes=new Map();
 for(const id of ['ak-akm','ak-ak103','ak-ak74','ak-ak74m','ak-rpk74','ak-ak105']){
  const {group,preset}=model(id);
  sizes.set(id,rangeY(familyMesh(group,'barrel',preset.parts.barrel,2)));
  clearWeaponSilhouette(group);
 }
 assert.ok(sizes.get('ak-ak74')>sizes.get('ak-akm')+.65);
 assert.ok(sizes.get('ak-ak74m')>sizes.get('ak-ak103')+.65);
 assert.ok(sizes.get('ak-ak105')>sizes.get('ak-rpk74')+.6);
});
test('AK R4.3 AKS-74U has shallow cover-mounted irons, not a tall optic silhouette',()=>{
 const {group}=model('ak-aks74u');
 const receiver=bounds(group,'receiver');
 assert.ok(receiver.max.y<3.4&&receiver.max.y>3.1,
  'low rear sight protrudes only slightly over the dust cover');
 clearWeaponSilhouette(group);
});

test('AK R4.3b exposes 24 compatible finish variants with safe saved body choices',()=>{
 const families=Object.values(FAMILY_PARTS);
 const variants=families.filter(p=>p.family==='ak'&&
  (/-(amber|red|plum)$/.test(p.id)||p.id.startsWith('ak-poly-plum-')||
   p.id==='ak-mag762-resin'));
 assert.equal(variants.length,24,'finish options must be explicit and selectable');
 for(const item of variants){
  assert.ok(['stock','grip','magazine','handguard'].includes(item.slot));
  assert.ok(FAMILY_PRESETS.some(p=>p.family==='ak'&&
   (item.receivers?.includes(p.parts.receiver)||
    (!item.receivers&&FAMILY_PARTS[p.parts.receiver].feed===item.feed))),
   item.id+' must be usable in a stock model');
 }
 const factory=FAMILY_PRESETS.find(p=>p.id==='ak-ak74');
 assert.equal(factory.parts.stock,'ak-wood74-amber');
 assert.equal(factory.parts.handguard,'ak-wood-long-amber');
});
test('AK R4.3b 7.62 magazine ribs are exactly three dark low-relief strokes',()=>{
 for(const id of ['ak-akm','ak-akms','ak-ak103']){
  const {group,preset}=model(id);
  const ribs=group.children.filter(m=>
   m.name.startsWith('family-magazine-'+preset.parts.magazine+'-')&&
   !m.name.endsWith('-0'));
  assert.equal(ribs.length,3,id+' magazine must have three ribs');
  assert.ok(bounds(group,'magazine').max.z-bounds(group,'magazine').min.z<=2.35);
  clearWeaponSilhouette(group);
 }
 const {group}=model('ak-ak74');
 assert.equal(group.children.filter(m=>m.name.startsWith('family-magazine-')).length,1,
  '5.45 magazine should not inherit 7.62 detail ribs');
 clearWeaponSilhouette(group);
});
