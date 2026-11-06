import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PARTS,FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly,
 setConfiguredFamilyPart,familyAccessoryAllowed} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const steel=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const dark=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
function model(id){
 const preset=FAMILY_PRESETS.find(p=>p.id===id);
 assert.ok(preset,id);
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),id);
 const group=buildWeaponSilhouette(preset.weapon,steel,dark,config);
 group.updateMatrixWorld(true);
 return {config,group};
}
const bounds=(model,slot)=>{
 const objects=model.group.children.filter(x=>x.name.startsWith('family-'+slot+'-'));
 const box=new THREE.Box3();
 for(const object of objects)box.expandByObject(object);
 assert.ok(!box.isEmpty(),slot);
 return box;
};
const hits=(model,x,y)=>{
 const ray=new THREE.Raycaster(new THREE.Vector3(x,y,20),
  new THREE.Vector3(0,0,-1));
 return ray.intersectObjects(model.group.children,true).length;
};

test('R2: 62 visual part definitions, 17 curated IDs and correct landmark furniture',()=>{
 assert.equal(Object.keys(FAMILY_PARTS).length,62);
 assert.equal(FAMILY_PRESETS.length,17);
 const byId=Object.fromEntries(FAMILY_PRESETS.map(p=>[p.id,p]));
 assert.equal(byId['ar-m16a4'].parts.handguard,'ar-m5-rail');
 assert.equal(byId['ar-car15'].parts.handguard,'ar-car15-ribbed');
 assert.equal(byId['ar-m4a1'].parts.handguard,'ar-quad');
 assert.equal(byId['ar-mk18'].parts.handguard,'ar-risii');
 assert.equal(byId['ak-ak74'].parts.stock,'ak-wood74');
 assert.equal(familyAccessoryAllowed({
  family:'ar',parts:{...byId['ar-mk18'].parts}},'foregrip','foregrip-vertical'),true);
});

test('R2: all 17 assembled profiles preserve shot tip, finite bounds and mesh budget',()=>{
 let profiles=0;
 for(const p of FAMILY_PRESETS){
  const {group,config}=model(p.id);
  const extent=new THREE.Box3().setFromObject(group);
  assert.ok(Math.abs(extent.max.x-resolveWeaponAssembly(config).muzzleX)<.001,
   p.id+' muzzle invariant');
  assert.ok(group.children.length>=12&&group.children.length<=28,
   p.id+' mesh budget: '+group.children.length);
  for(const mesh of group.children){
   assert.ok(mesh.name.startsWith('family-'),p.id+' part naming');
   assert.ok(mesh instanceof THREE.Mesh,p.id+' object type');
   if(mesh.geometry.type==='ExtrudeGeometry')profiles++;
   const b=new THREE.Box3().setFromObject(mesh);
   for(const n of [...b.min.toArray(),...b.max.toArray()])
    assert.ok(Number.isFinite(n),p.id+' finite extents');
  }
  assert.ok(extent.min.x< -11,p.id+' shoulder silhouette');
  assert.ok(extent.min.y< -5,p.id+' downward grip/magazine');
  clearWeaponSilhouette(group);
  assert.equal(group.children.length,0);
 }
 assert.ok(profiles>=60,'low-vertex exterior profiles should replace many boxes');
});

test('R2: AR handles preserve real negative space, unlike rectangular slabs',()=>{
 const a=model('ar-m16a1'),flat=model('ar-m16a4');
 assert.ok(hits(a,-2.0,3.7)>0,'carry-handle cap should exist');
 assert.equal(hits(a,-2.0,2.78),0,'carry-handle gap should be empty');
 assert.equal(hits(flat,-2.0,3.7),0,'flat-top must not retain carry-handle cap');
 clearWeaponSilhouette(a.group);clearWeaponSilhouette(flat.group);
});

test('R2: skeletal AK stock has visibly open center, traditional stock does not',()=>{
 const skeletal=model('ak-aks74u'),wood=model('ak-akm');
 assert.equal(hits(skeletal,-9.8,-1.0),0,'skeletal stock negative space');
 assert.ok(hits(wood,-9.8,-1.0)>0,'wood fixed-stock body');
 clearWeaponSilhouette(skeletal.group);clearWeaponSilhouette(wood.group);
});

test('R2: 7.62 AK magazine has stronger lateral curve than 5.45',()=>{
 const heavy=model('ak-ak103'),small=model('ak-ak74m');
 const a=bounds(heavy,'magazine'),b=bounds(small,'magazine');
 assert.ok(a.max.x>b.max.x+1,'distinct exterior curve even in grayscale');
 clearWeaponSilhouette(heavy.group);clearWeaponSilhouette(small.group);
});

test('R2: compact silhouettes differ without changing gameplay muzzle location',()=>{
 const a=model('ar-m16a1'),b=model('ar-mk18');
 assert.ok(resolveWeaponAssembly(a.config).lengthScale>
  resolveWeaponAssembly(b.config).lengthScale);
 const longGuard=bounds(a,'handguard'),shortGuard=bounds(b,'handguard');
 assert.ok(shortGuard.max.x>longGuard.max.x,
  'compact rail may approach tip even when exposed segment is shorter');
 assert.ok(shortGuard.max.z-longGuard.max.z>.1,
  'Mk 18 rail is visibly thicker');
 const compact=model('ak-aks74u'),full=model('ak-akm');
 assert.ok(resolveWeaponAssembly(compact.config).lengthScale<
  resolveWeaponAssembly(full.config).lengthScale);
 clearWeaponSilhouette(a.group);clearWeaponSilhouette(b.group);
 clearWeaponSilhouette(compact.group);clearWeaponSilhouette(full.group);
});

test('R2: old visual family saves normalize and new handguard IDs obey compatibility',()=>{
 let ar=model('ar-m4a1');
 const old=ar.config;
 const changed=setConfiguredFamilyPart(ar.config,'handguard','ar-risii');
 assert.equal(changed,old,'short front end should not fit mid-only selection');
 assert.equal(setConfiguredFamilyPart(old,'handguard','ak-wood-long'),old);
 clearWeaponSilhouette(ar.group);
});
