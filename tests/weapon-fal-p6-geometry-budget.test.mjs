/** Compare real measured triangles with contemporary Fieldwork family assets. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
const cfg=(id='fal-5000')=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),id);
const bb=x=>new THREE.Box3().setFromObject(x);
const create=()=>{const mat=new THREE.MeshBasicMaterial();return {mat,root:buildWeaponSilhouette('rifle',mat,mat,cfg())};};

import {countGeometry,buildAuditReport} from '../scripts/audit-weapon-geometry.mjs';
import {FAL_UPPER_STATIONS} from '../src/weapons/geometry/fal-receiver-form.ts';
import {FAL_HANDGUARD_STATIONS} from '../src/weapons/geometry/fal-handguard-profiles.ts';
test('P7 art geometry is no heavier than P6 and still close to G3',()=>{
 const all=buildAuditReport(),fal=all.find(x=>x.name==='FAL'),g3=all.find(x=>x.name==='G3A3');
 assert.ok(fal&&g3);
 console.log('FAL P7 TRIANGLE AUDIT',JSON.stringify(all));
 assert.ok(fal.triangles<=470,'new geometry must not restore P5 detail overload');
 assert.ok(fal.triangles<=g3.triangles,'FAL should stay simpler than its G3 peer');
 assert.ok(fal.meshes<=27,'two purposeful stamped ribs must not explode draw calls');
 assert.ok(fal.byPart.receiver.triangles<=220);
});
test('receiver and handguard use one uninterrupted six-point section per end',()=>{
 const {root,mat}=create();
 assert.equal(FAL_UPPER_STATIONS.length,2);
 assert.equal(FAL_HANDGUARD_STATIONS.length,2);
 const upper=root.children.find(x=>x.userData.falCrownedUpper);
 const hand=root.children.find(x=>x.userData.falFacetedHandguard);
 assert.equal(countGeometry(upper).triangles,24);
 assert.equal(countGeometry(hand).triangles,24);
 assert.ok(FAL_HANDGUARD_STATIONS[0].top>=1.85);
 assert.ok(FAL_HANDGUARD_STATIONS[0].bottom<=-2.10);
 clearWeaponSilhouette(root);mat.dispose();
});
test('barrel, carry handle and sights are large rectilinear forms',()=>{
 const {root,mat}=create();
 const barrel=root.children.find(x=>x.userData.falBoxBarrel);
 const carry=root.children.find(x=>x.userData.falCarryGrip);
 const combo=root.children.find(x=>x.userData.falMuzzleCombo);
 const collar=root.children.find(x=>x.userData.falMuzzleCollar);
 assert.ok([barrel,carry,combo,collar].every(x=>x?.geometry.type==='BoxGeometry'));
 const ears=root.children.filter(x=>x.userData.falFrontEar);
 assert.equal(ears.length,2);
 assert.ok(ears.every(x=>x.geometry.type==='BoxGeometry'));
 assert.equal(root.children.filter(x=>x.userData.falTriggerGuard).length,0);
 clearWeaponSilhouette(root);mat.dispose();
});
