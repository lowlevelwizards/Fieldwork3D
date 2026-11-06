import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {FAMILY_PRESETS,FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {partVisualBounds}
 from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {AR_VISUAL_ANATOMY,AK_VISUAL_ANATOMY}
 from '../src/weapons/geometry/weapon-receiver-anatomy.ts';

const mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
function assembled(id){
 const preset=FAMILY_PRESETS.find(p=>p.id===id);
 assert.ok(preset,id+' preset exists');
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),id);
 const group=buildWeaponSilhouette(preset.weapon,mat,mat,config);
 group.updateMatrixWorld(true);
 return {config,group};
}
function bounds(group,slot){
 const box=partVisualBounds(group,slot);
 assert.ok(box,slot+' bounds exist');
 return box;
}
const hits=(group,x,y)=>{
 const ray=new THREE.Raycaster(new THREE.Vector3(x,y,25),
  new THREE.Vector3(0,0,-1));
 return ray.intersectObjects(group.children.filter(o=>!o.userData.weaponPixelArt),true)
  .length>0;
};
test('R3.2 retains 51 part IDs, all 11 presets and authoritative muzzle',()=>{
 assert.equal(Object.keys(FAMILY_PARTS).length,51);
 assert.equal(FAMILY_PRESETS.length,11);
 for(const p of FAMILY_PRESETS){
  const {config,group}=assembled(p.id);
  const box=new THREE.Box3().setFromObject(group);
  assert.ok(Math.abs(box.max.x-resolveWeaponAssembly(config).muzzleX)<.001,
   p.id+' muzzle endpoint');
  assert.ok(group.children.length<=28,p.id+' mesh budget: '+group.children.length);
  clearWeaponSilhouette(group);
 }
});
test('R3.2 shared visual anatomy makes receiver, grip and magwell a joined center',()=>{
 for(const p of FAMILY_PRESETS){
  const {group}=assembled(p.id);
  const body=bounds(group,'receiver'),grip=bounds(group,'grip');
  const magazine=bounds(group,'magazine'),guard=bounds(group,'handguard');
  assert.ok(body.intersectsBox(grip),p.id+' grip joint');
  assert.ok(body.intersectsBox(magazine),p.id+' magazine joint');
  assert.ok(body.min.y<=-2.54,p.id+' visible lower receiver seating');
  assert.ok(grip.getCenter(new THREE.Vector3()).x<
   magazine.getCenter(new THREE.Vector3()).x,p.id+' grip behind magazine');
  assert.ok(magazine.min.y<-5,p.id+' magazine still visible');
  assert.ok(guard.min.x>magazine.min.x+2,p.id+' handguard beyond magazine root');
  assert.ok(magazine.max.x<4.3,p.id+' magazine no longer projects under handguard');
  clearWeaponSilhouette(group);
 }
 assert.ok(AR_VISUAL_ANATOMY.magwellCenterX<3.55);
 assert.ok(AK_VISUAL_ANATOMY.magwellCenterX<3.55);
});
test('R3.2 STANAG and AK magazines are distinctly narrower but keep different curvature',()=>{
 for(const id of ['ar-m16a1','ar-m4a1','ar-mk18']){
  const {group}=assembled(id),b=bounds(group,'magazine');
  assert.ok(b.max.x-b.min.x<=2.9,id+' STANAG narrow side silhouette');
  clearWeaponSilhouette(group);
 }
 const akm=assembled('ak-akm'),ak74=assembled('ak-ak74');
 const heavy=bounds(akm.group,'magazine'),light=bounds(ak74.group,'magazine');
 assert.ok(heavy.max.x-light.max.x>=1.0,'7.62 curved lower end more forward');
 assert.ok(light.max.x-light.min.x<3.1,'5.45 silhouette narrower');
 clearWeaponSilhouette(akm.group);clearWeaponSilhouette(ak74.group);
});
test('R3.2 preserves the AKS-74U open stock and slimmer AR front sight',()=>{
 const u=assembled('ak-aks74u'),m=assembled('ar-m4a1');
 assert.equal(hits(u.group,-9.65,-1.05),false,'AKS stock remains skeletal');
 assert.ok(hits(m.group,16.43,1.4),'narrow A-frame left');
 assert.ok(hits(m.group,17.23,1.4),'narrow A-frame right');
 assert.equal(hits(m.group,16.83,1.4),false,'A-frame negative space survives');
 assert.ok(bounds(m.group,'barrel').max.y<3.25,'sight remains squat');
 clearWeaponSilhouette(u.group);clearWeaponSilhouette(m.group);
});
test('R3.2 artwork is a handful of non-shadowing nearest-neighbor decals',()=>{
 for(const id of ['ar-car15','ar-m4a1','ar-mk18','ak-aks74u','ak-ak105']){
  const {group}=assembled(id);
  const decals=group.children.filter(m=>m.userData.weaponPixelArt);
  assert.ok(decals.length>=1&&decals.length<=2,id+' limited detail budget');
  for(const mesh of decals){
   assert.equal(mesh.castShadow,false);
   assert.equal(mesh.receiveShadow,false);
   assert.equal(mesh.material.map.magFilter,THREE.NearestFilter);
   assert.equal(mesh.material.map.minFilter,THREE.NearestFilter);
   assert.equal(mesh.material.depthWrite,false);
   assert.ok(mesh.name.startsWith('family-art-'));
  }
  clearWeaponSilhouette(group);
 }
 assert.match(source('src/equipment-weapon-workbench.ts'),/object\.userData\.weaponPixelArt/);
 assert.match(source('scripts/audit-weapon-ortho-r2.mjs'),/o\.userData\.weaponPixelArt/);
});
