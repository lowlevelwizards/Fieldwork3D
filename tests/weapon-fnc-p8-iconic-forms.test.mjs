/** FN FNC P8 iconic form: view-independent shape priorities and safe anchors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const get=(g,k)=>g.children.find(c=>c.userData[k]);
const box=g=>new THREE.Box3().setFromObject(g);
const width=g=>box(g).max.x-box(g).min.x;
test('P8: factory path uses identical geometry; suppressed mode has no factory muzzle',()=>{
 const m=new THREE.MeshBasicMaterial();
 const preset=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const factory=buildWeaponSilhouette('rifle',m,m,preset);
 assert.equal(Boolean(get(factory,'fncP8OpenTriggerGuard')),false);
 assert.ok(get(factory,'fncP8DistinctMagwell'));
 const bare=buildFNCStage1Silhouette(m,{},false);
 assert.equal(Boolean(get(bare,'fncMuzzle')),false);
 assert.ok(Math.abs(box(bare).max.x-FNC_P1.muzzleX)<.02);
 clearWeaponSilhouette(factory);clearWeaponSilhouette(bare);m.dispose();
});
