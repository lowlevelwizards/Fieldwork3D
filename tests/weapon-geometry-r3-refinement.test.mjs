import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {FAMILY_PRESETS,FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {weaponVisualLayout}
 from '../src/weapons/geometry/weapon-visual-layout.ts';
import {partVisualBounds,workbenchVisualAnchors}
 from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {AR_BLACK_METAL,AR_BLACK_POLYMER,AR_MUTED_FDE,AK_WARM_RESIN}
 from '../src/weapons/geometry/weapon-visual-palette.ts';

const metal=new THREE.MeshBasicMaterial(),polymer=new THREE.MeshBasicMaterial();
const model=(id)=>{
 const preset=FAMILY_PRESETS.find(p=>p.id===id);
 assert.ok(preset,'missing '+id);
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),id);
 const group=buildWeaponSilhouette(config.weapon,metal,polymer,config);
 return {preset,config,group};
};
const slotBox=(g,slot)=>{
 const b=partVisualBounds(g,slot);
 assert.ok(b,'missing visual '+slot);
 return b;
};
const overlap=(a,b)=>(Math.min(a.max,b.max)-Math.max(a.min,b.min));

test('R3: retains all 51 family IDs, 11 presets and physical muzzle invariants',()=>{
 assert.equal(Object.keys(FAMILY_PARTS).length,51);
 assert.equal(FAMILY_PRESETS.length,11);
 for(const preset of FAMILY_PRESETS){
  const {config,group}=model(preset.id);
  const extent=new THREE.Box3().setFromObject(group);
  assert.ok(Math.abs(extent.max.x-resolveWeaponAssembly(config).muzzleX)<.001,preset.id);
  assert.ok(group.children.length<=28,'budget '+preset.id);
  const layout=weaponVisualLayout(config);
  assert.equal(layout.longitudinalScale,resolveWeaponAssembly(config).lengthScale);
  assert.ok(layout.longitudinalScale>0&&layout.longitudinalScale<=1);
  clearWeaponSilhouette(group);
 }
});

test('R3: compact Mk18 and AKS-74U actually read shorter in scaled workbench',()=>{
 for(const [large,small] of [['ar-m4a1','ar-mk18'],['ak-ak105','ak-aks74u']]){
  const a=model(large),b=model(small);
  const width=(m)=>{
   const bounds=new THREE.Box3().setFromObject(m.group);
   return (bounds.max.x-bounds.min.x)*
    weaponVisualLayout(m.config).longitudinalScale;
  };
  assert.ok(width(b)<width(a)*.9,small+' must be >10% visually shorter');
  clearWeaponSilhouette(a.group);clearWeaponSilhouette(b.group);
 }
});

test('R3: major part connections have positive deliberate overlap in local silhouettes',()=>{
 for(const p of FAMILY_PRESETS){
  const {group}=model(p.id);
  const stock=slotBox(group,'stock'),receiver=slotBox(group,'receiver');
  const grip=slotBox(group,'grip'),mag=slotBox(group,'magazine');
  const guard=slotBox(group,'handguard'),barrel=slotBox(group,'barrel');
  assert.ok(overlap({min:stock.min.x,max:stock.max.x},
    {min:receiver.min.x,max:receiver.max.x})>.05,p.id+' stock joint');
  assert.ok(overlap({min:receiver.min.x,max:receiver.max.x},
    {min:guard.min.x,max:guard.max.x})>.05,p.id+' handguard joint');
  assert.ok(overlap({min:guard.min.x,max:guard.max.x},
    {min:barrel.min.x,max:barrel.max.x})>.05,p.id+' barrel joint');
  assert.ok(grip.max.y>receiver.min.y+.01,p.id+' grip connected to receiver');
  assert.ok(mag.max.y>receiver.min.y+.01,p.id+' mag connected to receiver');
  clearWeaponSilhouette(group);
 }
});

test('R3: body socket labels project over real mesh envelopes, not floating constants',()=>{
 for(const preset of FAMILY_PRESETS){
  const {config,group}=model(preset.id);
  const anchors=workbenchVisualAnchors(config,group,'body');
  assert.equal(anchors.length,6);
  assert.equal(new Set(anchors.map(a=>a.slot)).size,6);
  for(const anchor of anchors){
   const slot=anchor.slot.replace('body-','');
   const box=slotBox(group,slot);
   assert.ok(anchor.x>=box.min.x&&anchor.x<=box.max.x,preset.id+' '+slot+' x');
   assert.ok(anchor.y>=box.min.y&&anchor.y<=box.max.y,preset.id+' '+slot+' y');
   assert.ok(anchor.z>box.max.z,preset.id+' '+slot+' near visible surface');
  }
  clearWeaponSilhouette(group);
 }
});

test('R3: non-Mk18 ARs are consistently near-black while Mk18 furniture is FDE',()=>{
 for(const id of ['ar-m16a1','ar-m16a4','ar-car15','ar-m4a1']){
  const {group}=model(id);
  assert.ok(group.children.filter(m=>!m.userData.weaponPixelArt).every(m=>
   [AR_BLACK_METAL,AR_BLACK_POLYMER].includes(m.material)),
   id+' primary geometry black only');
  clearWeaponSilhouette(group);
 }
 const {group}=model('ar-mk18');
 for(const slot of ['stock','handguard']){
  const materials=group.children.filter(m=>m.name.startsWith('family-'+slot+'-'))
   .map(m=>m.material);
  assert.ok(materials.includes(AR_MUTED_FDE),slot+' should be FDE');
 }
 assert.ok(group.children.some(m=>m.material===AR_BLACK_METAL),
  'Mk18 should retain a black receiver');
 clearWeaponSilhouette(group);
});

test('R3: baked resin palette and 3D/2D same scaled transform are wired',()=>{
 const {group}=model('ak-aks74u');
 assert.ok(group.children.some(m=>m.material===AK_WARM_RESIN),
  'AKS-74U resin grip/magazine should be recognizably warm');
 clearWeaponSilhouette(group);
 const src=readFileSync(new URL('../src/equipment-weapon-workbench.ts',
  import.meta.url),'utf8');
 assert.match(src,/this\.model\.scale\.x=layout\.longitudinalScale/);
 assert.match(src,/workbenchVisualAnchors\(this\.config,this\.model,this\.mode\)/);
 assert.match(src,/const centerX=weaponVisualLayout\(this\.config\)\.workbenchCenterX/);
 assert.match(src,/this\.sideCamera\.lookAt\(centerX,0,0\)/);
});
