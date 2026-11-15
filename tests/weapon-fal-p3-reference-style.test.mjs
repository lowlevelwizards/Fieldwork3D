/** FAL P3: reference-led visual geometry contract.
 * Geometry checks complement actual side/3-quarter screenshots; passing
 * them alone is NOT artistic acceptance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {FAL_MAG20_OUTLINE,FAL_MAG20_DEPTH}
 from '../src/weapons/geometry/fal-magazine-profiles.ts';
import {FAL_HANDGUARD_STATIONS} from '../src/weapons/geometry/fal-handguard-profiles.ts';
import {FAL_LOWER_METAL} from '../src/weapons/geometry/weapon-visual-palette.ts';
import {FAL_VISUAL_ANATOMY} from '../src/weapons/geometry/weapon-receiver-anatomy.ts';
import {carriedMagazineGeometry} from '../src/operator-carried-magazines.ts';

const config=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fal-5000');
const box=o=>new THREE.Box3().setFromObject(o);
test('P3 magazine: front heel rises visibly above rear while socket, depth and carried shape survive',()=>{
 const m=new THREE.MeshBasicMaterial(),c=config();
 const root=buildWeaponSilhouette('rifle',m,m,c);
 const mag=root.getObjectByName('family-magazine-fal-mag20-0');
 assert.ok(mag);
 const rear=FAL_MAG20_OUTLINE[4],front=FAL_MAG20_OUTLINE[3];
 assert.ok(front[0]>rear[0]&&front[1]-rear[1]>=.45,
  'visible diagonal steel magazine floorplate, not flat bottom bevels');
 assert.equal(Math.min(...FAL_MAG20_OUTLINE.map(p=>p[1])),-8.05);
 assert.ok(FAL_MAG20_OUTLINE[1][0]-FAL_MAG20_OUTLINE[0][0]>=3.0);
 assert.ok(FAL_MAG20_OUTLINE[1][0]-FAL_MAG20_OUTLINE[0][0]<3.4);
 assert.equal(FAL_VISUAL_ANATOMY.magazineWidthX,3.22);
 assert.ok(Math.abs(box(mag).max.z-box(mag).min.z-FAL_MAG20_DEPTH)<.001);
 const carried=carriedMagazineGeometry('fal-mag20');
 assert.ok(carried&&carried.getAttribute('position').count>0);
 carried.dispose();clearWeaponSilhouette(root);m.dispose();
});
test('P3 receiver: deeper shaped lower is a dedicated steel tone, not a duplicate G3 slab',()=>{
 const m=new THREE.MeshBasicMaterial(),root=buildWeaponSilhouette('rifle',m,m,config());
 const upper=root.getObjectByName('family-receiver-fal-50-receiver-0');
 const lower=root.getObjectByName('family-receiver-fal-50-receiver-1');
 const magwell=root.getObjectByName('family-receiver-fal-50-receiver-2');
 assert.ok(upper&&lower&&magwell);
 assert.strictEqual(lower.material,FAL_LOWER_METAL);
 assert.strictEqual(magwell.material,FAL_LOWER_METAL);
 assert.notStrictEqual(upper.material,lower.material);
 assert.ok(box(lower).min.y<box(upper).min.y-.9,
  'FAL lower housing must be a visible structural shape');
 const port=root.children.filter(x=>x.userData.falEjectionPort);
 assert.equal(port.length,1,'only one right-side ejection-port relief');
 assert.ok(box(port[0]).min.z>.65&&box(port[0]).max.z<1.52);
 const left=root.getObjectByName('family-receiver-fal-50-receiver-7');
 assert.ok(left&&box(left).max.z<0,'charging handle belongs on left');
 assert.equal(left.userData.falChargingHandle,true);
 assert.ok(box(left).min.x>0,'charging handle belongs on receiver front, not behind grip');
 const pad=root.getObjectByName('family-stock-fal-fixed-polymer-1');
 assert.ok(pad&&box(pad).max.x-box(pad).min.x>=.87,
  'thick FN buttpad must read clearly in side silhouette');
 clearWeaponSilhouette(root);m.dispose();
});
test('P3 handle and guard: contoured handle supported, six-sided vents follow front taper',()=>{
 const m=new THREE.MeshBasicMaterial(),root=buildWeaponSilhouette('rifle',m,m,config());
 const grip=root.children.find(x=>x.userData.falCarryGrip);
 const support=root.children.find(x=>x.userData.falCarrySupport);
 assert.ok(grip&&support&&box(grip).intersectsBox(box(support)));
 assert.ok(grip.geometry.type==='ExtrudeGeometry',
  'polymer carry handhold must be a contoured profile, not a box');
 assert.ok(FAL_HANDGUARD_STATIONS.at(-1).halfWidth<
  FAL_HANDGUARD_STATIONS[1].halfWidth-.20);
 const hand=root.children.find(x=>x.userData.falFacetedHandguard);
 assert.ok(hand&&hand.geometry.getAttribute('position').count<=200);
 const vents=root.children.filter(x=>x.userData.falVentCount===3);
 assert.equal(vents.length,2);
 for(const v of vents){
  assert.equal(v.geometry.getAttribute('position').count,18);
  assert.equal(v.userData.falFaceAligned,true);
  assert.ok(box(v).max.z-box(v).min.z>.01);
 }
 assert.equal(root.children.length,25,'P4 identity is bounded to four additional meshes');
 assert.equal(resolveWeaponAssembly(config()).muzzleX,22);
 assert.equal(resolveWeaponAssembly(config()).stockX,-15);
 clearWeaponSilhouette(root);m.dispose();
});
