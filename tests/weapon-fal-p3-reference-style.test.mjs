/** FAL P7 reference silhouette assertions: retired previous ornamental forms. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
const cfg=(id='fal-5000')=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),id);
const bb=x=>new THREE.Box3().setFromObject(x);
const create=()=>{const mat=new THREE.MeshBasicMaterial();return {mat,root:buildWeaponSilhouette('rifle',mat,mat,cfg())};};

import {FAL_FNC_CALIBRATED_LOWER_METAL,FAL_MAG_RIB} from '../src/weapons/geometry/weapon-visual-palette.ts';
import {FAL_MAG20_OUTLINE,FAL_MAG20_DEPTH} from '../src/weapons/geometry/fal-magazine-profiles.ts';
import {carriedMagazineGeometry} from '../src/operator-carried-magazines.ts';
test('the distinctive slanted heel survives a much narrower stamped magazine',()=>{
 const {root,mat}=create();
 const mag=root.getObjectByName('family-magazine-fal-mag20-0');
 const ribs=root.children.filter(x=>x.userData.falStampedRib);
 assert.ok(mag);assert.equal(ribs.length,2);
 assert.ok(FAL_MAG20_OUTLINE[3][1]-FAL_MAG20_OUTLINE[4][1]>=.45);
 assert.equal(Math.min(...FAL_MAG20_OUTLINE.map(p=>p[1])),-8.05);
 assert.equal(FAL_MAG20_DEPTH,1.62);
 assert.ok(ribs.every(x=>x.material===FAL_MAG_RIB&&bb(x).max.z>bb(mag).max.z));
 const carried=carriedMagazineGeometry('fal-mag20');
 assert.ok(carried?.getAttribute('position').count>0);
 carried.dispose();clearWeaponSilhouette(root);mat.dispose();
});
test('upper, one-piece lower/magwell and low bore-line ejection rectangle',()=>{
 const {root,mat}=create();
 const upper=root.getObjectByName('family-receiver-fal-50-receiver-0');
 const lower=root.getObjectByName('family-receiver-fal-50-receiver-1');
 assert.ok(upper&&lower);
 assert.strictEqual(lower.material,FAL_FNC_CALIBRATED_LOWER_METAL);
 assert.ok(bb(lower).min.y<=-3.19);
 assert.ok(!root.children.some(x=>x.userData.falTriggerGuard));
 const port=root.children.find(x=>x.userData.falEjectionPort);
 assert.ok(port&&port.userData.falRectangularPort);
 assert.ok(bb(port).min.x>=-.83&&bb(port).max.x<=2.68);
 assert.ok(bb(port).min.y>=.10&&bb(port).max.y<=.84);
 assert.equal(port.geometry.getIndex().count,6);
 const charger=root.children.find(x=>x.userData.falChargingHandle);
 assert.ok(charger&&charger.userData.falProtrudingHandle);
 assert.ok(bb(charger).min.z<-2.3&&bb(charger).max.z<0);
 clearWeaponSilhouette(root);mat.dispose();
});
test('the carry handle is a real rectangular block and both sides have big pivot bosses',()=>{
 const {root,mat}=create();
 const handle=root.children.find(x=>x.userData.falCarryGrip);
 const support=root.children.find(x=>x.userData.falCarrySupport);
 assert.equal(handle.geometry.type,'BoxGeometry');
 assert.ok(bb(handle).intersectsBox(bb(support)));
 const pivots=root.children.filter(x=>x.userData.falPivotSide);
 assert.equal(pivots.length,2);
 assert.ok(pivots.every(x=>x.geometry.parameters.radiusTop>=.78));
 assert.ok(resolveWeaponAssembly(cfg()).muzzleX===22);
 clearWeaponSilhouette(root);mat.dispose();
});
