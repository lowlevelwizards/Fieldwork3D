/** R4.4 critical AR art contracts: geometry and saves, not weapon mechanics. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {partVisualBounds} from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {AR_BARREL_ART} from '../src/weapons/geometry/ar-barrel-profiles.ts';
import {workbenchFitDistance} from '../src/weapons/geometry/weapon-workbench-camera-fit.ts';
const mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const model=id=>{
 const p=FAMILY_PRESETS.find(p=>p.id===id);
 assert.ok(p,id);
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
 const g=buildWeaponSilhouette(p.weapon,mat,mat,cfg);
 g.updateMatrixWorld(true);
 return {g,cfg};
};
const bound=(g,slot)=>{
 const b=partVisualBounds(g,slot);assert.ok(b,slot);return b;
};
const hits=(g,x,y)=>new THREE.Raycaster(
 new THREE.Vector3(x,y,25),new THREE.Vector3(0,0,-1))
 .intersectObjects(g.children.filter(x=>!x.userData.weaponPixelArt),true).length>0;
test('R4.4 eight AR silhouettes keep joined pieces and authoritative muzzle tips',()=>{
 const ar=FAMILY_PRESETS.filter(p=>p.family==='ar');
 assert.equal(ar.length,8);
 for(const p of ar){
  const {g,cfg}=model(p.id);
  assert.ok(g.children.length<=32,p.id+' geometry budget');
  const stock=bound(g,'stock'),receiver=bound(g,'receiver');
  const grip=bound(g,'grip'),mag=bound(g,'magazine');
  const guard=bound(g,'handguard'),barrel=bound(g,'barrel');
  assert.ok(stock.intersectsBox(receiver),p.id+' seated stock');
  assert.ok(grip.intersectsBox(receiver),p.id+' seated grip');
  assert.ok(mag.intersectsBox(receiver),p.id+' seated magazine');
  assert.ok(receiver.intersectsBox(guard),p.id+' seated guard');
  assert.ok(guard.intersectsBox(barrel),p.id+' seated barrel');
  assert.ok(Math.abs(new THREE.Box3().setFromObject(g).max.x-
   resolveWeaponAssembly(cfg).muzzleX)<.001,p.id+' game muzzle');
  clearWeaponSilhouette(g);
 }
});
test('R4.4 unified retro carry handles have a connected top and open cavity',()=>{
 for(const id of ['ar-m16a1','ar-m16a2','ar-car15','ar-colt733']){
  const {g}=model(id);
  const handle=g.children.find(m=>m.name.startsWith('family-receiver-')&&m.name.endsWith('-4'));
  assert.ok(handle,id+' unified handle');
  assert.equal(handle.geometry.type,'ExtrudeGeometry');
  assert.ok(hits(g,-2,3.72),id+' upper bridge');
  assert.equal(hits(g,-2,2.78),false,id+' true open cavity');
  clearWeaponSilhouette(g);
 }
});
test('R4.4 front sights have thick outer silhouette but hollow middle',()=>{
 for(const id of ['ar-m16a1','ar-m16a2','ar-m16a4','ar-m4a1','ar-car15','ar-colt733']){
  const {g,cfg}=model(id);
  const s=AR_BARREL_ART[cfg.build.parts.barrel].sightX;
  assert.ok(s!==null,id+' front tower landmark');
  assert.ok(hits(g,s-.70,1.1),id+' rear leg');
  assert.equal(hits(g,s,1.40),false,id+' open sight cavity');
  clearWeaponSilhouette(g);
 }
});
test('R4.4 handguard families retain individual character and short Mk18 muzzle clearance',()=>{
 for(const [id,mark] of [['ar-m16a1','a1-vents'],
  ['ar-m16a2','poly-ribs'],['ar-mk12mod0','pri-vents'],
  ['ar-m4a1','ras-panel'],['ar-mk18','ris-panel']]){
  const {g}=model(id);
  assert.ok(g.children.some(x=>x.name==='family-art-'+mark),id+' distinct art');
  if(id==='ar-mk12mod0')
   assert.ok(g.children.some(x=>x.geometry.type==='CylinderGeometry'&&
    x.geometry.parameters.radialSegments===6),'Mk12 Mod 0 PRI tube');
  if(id==='ar-mk18'){
   const guard=bound(g,'handguard'),tip=bound(g,'barrel').max.x;
   assert.ok(guard.max.x<=14.45,'RIS II rearward of old rail endpoint');
   assert.ok(tip-guard.max.x>1.25,'Mk18 muzzle visible');
  }
  clearWeaponSilhouette(g);
 }
});
test('R4.4 magazines have mirrored low-cost art and one-sided receiver port',()=>{
 for(const id of ['ar-m16a1','ar-colt733','ar-mk18']){
  const {g}=model(id),decals=g.children.filter(x=>x.userData.weaponPixelArt);
  const magazine=decals.filter(x=>x.name.startsWith('family-art-ar-mag-'));
  assert.equal(magazine.length,2,id+' two magazine side marks');
  assert.ok(magazine.some(x=>x.position.z>0)&&magazine.some(x=>x.position.z<0));
  assert.equal(decals.filter(x=>x.name==='family-art-ar-port').length,1);
  assert.ok(decals.every(x=>!x.castShadow&&!x.receiveShadow));
  clearWeaponSilhouette(g);
 }
});
test('R4.4 workbench framing provides a wider view for narrow phone cards',()=>{
 const bounds=new THREE.Box3(new THREE.Vector3(-17,-8,-3),new THREE.Vector3(23,8,3));
 const narrow=workbenchFitDistance(bounds,640,330);
 const wide=workbenchFitDistance(bounds,920,550);
 assert.ok(narrow>wide,'narrower view has more camera distance');
 assert.ok(Number.isFinite(narrow)&&narrow<110);
});
