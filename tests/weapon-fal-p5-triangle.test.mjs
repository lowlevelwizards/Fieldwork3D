/** The bold triangular roof is retained; old smooth end taper is retired. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
const cfg=(id='fal-5000')=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),id);
const bb=x=>new THREE.Box3().setFromObject(x);
const create=()=>{const mat=new THREE.MeshBasicMaterial();return {mat,root:buildWeaponSilhouette('rifle',mat,mat,cfg())};};

import {FAL_UPPER_STATIONS,falUpperSideHalfZ,falUpperShoulderY}
 from '../src/weapons/geometry/fal-receiver-form.ts';
import {FAL_HANDGUARD_STATIONS,FAL_HANDGUARD_ROOF_RATIO,falHandguardSideHalfZAt,
 falHandguardShoulderY} from '../src/weapons/geometry/fal-handguard-profiles.ts';
import {FAL_MAG20_OUTLINE} from '../src/weapons/geometry/fal-magazine-profiles.ts';
test('receiver and fore-end preserve expressive top-to-shoulder taper',()=>{
 const {root,mat}=create();
 const a=FAL_UPPER_STATIONS[0],h=FAL_HANDGUARD_STATIONS[0];
 assert.equal(FAL_UPPER_STATIONS.length,2);
 assert.equal(FAL_HANDGUARD_STATIONS.length,2);
 assert.ok(a.roofHalfZ/a.sideHalfZ<=.41);
 assert.ok((a.top-falUpperShoulderY(a))/(a.top-a.bottom)>=.65);
 assert.ok(FAL_HANDGUARD_ROOF_RATIO<=.42);
 assert.ok((h.top-falHandguardShoulderY(h))/(h.top-h.bottom)>=.60);
 assert.ok(falUpperSideHalfZ(1.50)<falUpperSideHalfZ(-.1)-.75);
 assert.ok(falHandguardSideHalfZAt(9.22,.75)<falHandguardSideHalfZAt(9.22,-.5)-.5);
 clearWeaponSilhouette(root);mat.dispose();
});
test('both sides of three handguard vent quads stay ON the actual sloping faces',()=>{
 const {root,mat}=create();
 const vents=root.children.filter(x=>x.userData.falVentCount===3);
 assert.equal(vents.length,2);
 for(const mesh of vents){
  const p=mesh.geometry.getAttribute('position');
  assert.equal(p.count,12);
  for(let i=0;i<p.count;i++)
   assert.ok(Math.abs(Math.abs(p.getZ(i))-
    (falHandguardSideHalfZAt(p.getX(i),p.getY(i))+.035))<1e-5);
 }
 assert.equal(Math.min(...FAL_MAG20_OUTLINE.map(p=>p[1])),-8.05);
 clearWeaponSilhouette(root);mat.dispose();
});
test('single protruding charging block, not layered charging stickers',()=>{
 const {root,mat}=create();
 const lever=root.children.filter(x=>x.userData.falChargingHandle);
 assert.equal(lever.length,1);
 assert.equal(lever[0].geometry.type,'BoxGeometry');
 assert.ok(bb(lever[0]).min.z<-2.3);
 assert.equal(root.children.filter(x=>x.userData.falChargingTrack).length,0);
 assert.equal(root.children.filter(x=>x.userData.falSurfaceFitted).length,0);
 clearWeaponSilhouette(root);mat.dispose();
});
