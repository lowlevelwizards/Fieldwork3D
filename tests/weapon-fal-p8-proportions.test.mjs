/** P8 low-poly silhouette acceptance: compare the authored shapes with P7.
 * World X = stock-to-muzzle, Y = vertical, Z = side-to-side depth.
 * Camera/gameplay/muzzle anchors must not move with this art pass.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {FAL_UPPER_STATIONS} from '../src/weapons/geometry/fal-receiver-form.ts';
import {FAL_HANDGUARD_STATIONS,falHandguardShoulderY}
 from '../src/weapons/geometry/fal-handguard-profiles.ts';
import {FAL_MAG20_OUTLINE,FAL_MAG20_CENTER_X}
 from '../src/weapons/geometry/fal-magazine-profiles.ts';
import {FAL_TRANSITION_METAL} from '../src/weapons/geometry/weapon-visual-palette.ts';
import {countGeometry,buildAuditReport} from '../scripts/audit-weapon-geometry.mjs';
const box=x=>new THREE.Box3().setFromObject(x);
const make=()=>{
 const m=new THREE.MeshBasicMaterial();
 const c=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fal-5000');
 return {m,c,root:buildWeaponSilhouette('rifle',m,m,c)};
};
test('P8 upper is smaller than handguard and separated by one dark steel block',()=>{
 const {root,m}=make(),upper=FAL_UPPER_STATIONS[0],hand=FAL_HANDGUARD_STATIONS[0];
 assert.equal(FAL_UPPER_STATIONS.length,2);
 assert.equal(FAL_HANDGUARD_STATIONS.length,2);
 assert.ok(upper.top<hand.top&&upper.sideHalfZ<hand.halfWidth);
 assert.ok(upper.top-upper.bottom<hand.top-hand.bottom);
 assert.ok(hand.x-FAL_UPPER_STATIONS[1].x>=1.09);
 const bridge=root.children.filter(x=>x.userData.falReceiverHandguardBridge);
 assert.equal(bridge.length,1);
 assert.equal(bridge[0].geometry.type,'BoxGeometry');
 assert.equal(bridge[0].material,FAL_TRANSITION_METAL);
 const b=box(bridge[0]);
 assert.ok(b.min.x<FAL_UPPER_STATIONS[1].x&&b.max.x>hand.x);
 assert.ok(b.max.y<hand.top);
 clearWeaponSilhouette(root);m.dispose();
});
test('P8 retains the tall shoulder wedge but removes the fore-end lower belly',()=>{
 const {root,m}=make(),h=FAL_HANDGUARD_STATIONS[0];
 assert.equal(h.top,1.90);assert.equal(h.bottom,-1.56);
 assert.equal(falHandguardShoulderY(h),-.55);
 const shell=root.children.find(x=>x.userData.falFacetedHandguard);
 assert.equal(countGeometry(shell).triangles,24);
 clearWeaponSilhouette(root);m.dispose();
});
test('P8 stock heel grows and the grip becomes shorter and more swept',()=>{
 const {root,m}=make();
 const stock=box(root.getObjectByName('family-stock-fal-fixed-polymer-0'));
 const pad=box(root.getObjectByName('family-stock-fal-fixed-polymer-1'));
 const grip=box(root.getObjectByName('family-grip-fal-grip-0'));
 assert.ok(stock.min.y<-4.05);
 assert.ok(stock.max.y>.70);
 assert.ok(stock.max.z-stock.min.z<=2.35);
 assert.ok(pad.max.y-pad.min.y>=4.25);
 assert.ok(grip.min.y>-5.90&&grip.min.x<-6.48);
 assert.ok(Math.abs(pad.min.x+15)<.001);
 clearWeaponSilhouette(root);m.dispose();
});
test('P8 wider steel 7.62 magazine, unchanged nominal 20-round mount',()=>{
 const {root,m,c}=make();
 assert.equal(FAL_MAG20_OUTLINE[1][0]-FAL_MAG20_OUTLINE[0][0],3.78);
 assert.equal((FAL_MAG20_OUTLINE[1][0]+FAL_MAG20_OUTLINE[0][0])/2,FAL_MAG20_CENTER_X);
 assert.equal(Math.min(...FAL_MAG20_OUTLINE.map(x=>x[1])),-8.05);
 assert.equal(root.children.filter(x=>x.userData.falStampedRib).length,2);
 const assembly=resolveWeaponAssembly(c);
 assert.equal(assembly.muzzleX,22);
 assert.equal(assembly.stockX,-15);
 clearWeaponSilhouette(root);m.dispose();
});
test('P8 oversized U-sight and doubled muzzle retain the same X22 muzzle datum',()=>{
 const {root,m}=make(),ears=root.children.filter(x=>x.userData.falFrontEar);
 assert.equal(ears.length,2);
 assert.equal(root.children.filter(x=>x.userData.falFrontPost).length,0);
 assert.ok(ears.every(x=>box(x).max.y>3.1));
 const device=root.children.find(x=>x.userData.falMuzzleCombo);
 const collar=root.children.find(x=>x.userData.falMuzzleCollar);
 const barrel=root.children.find(x=>x.userData.falBoxBarrel);
 assert.ok(device&&collar&&barrel);
 assert.ok(box(device).max.x-box(device).min.x>=3.35);
 assert.ok(box(device).max.z-box(device).min.z>=1.49);
 assert.ok(box(collar).intersectsBox(box(device)));
 assert.ok(box(barrel).intersectsBox(box(collar)));
 assert.ok(Math.abs(box(root).max.x-22)<.001);
 assert.equal(root.children.filter(x=>x.userData.falMuzzleSlots).length,1);
 const data=buildAuditReport(),fal=data.find(x=>x.name==='FAL');
 assert.ok(fal.triangles<=390,'maintain P7 sculptural economy');
 assert.ok(fal.meshes<=27);
 clearWeaponSilhouette(root);m.dispose();
});
