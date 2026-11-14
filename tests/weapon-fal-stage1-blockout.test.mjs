import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAL_STAGE1,buildFALStage1Silhouette}
 from '../src/weapons/geometry/fal-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {AR_BARREL_ART} from '../src/weapons/geometry/ar-barrel-profiles.ts';
import {HK_BARREL_ART} from '../src/weapons/geometry/hk-barrel-profiles.ts';

const box=(g)=>new THREE.Box3().setFromObject(g);
test('FAL S1: authored landmarks preserve distinct M4/G3/FAL relationships',()=>{
 assert.equal(AR_BARREL_ART['ar-145-gov'].muzzleX,18.4);
 assert.equal(HK_BARREL_ART['hk-g3-service'].muzzleX,22.4);
 assert.ok(FAL_STAGE1.muzzleX>AR_BARREL_ART['ar-145-gov'].muzzleX);
 assert.ok(FAL_STAGE1.muzzleX<HK_BARREL_ART['hk-g3-service'].muzzleX);
 assert.ok(FAL_STAGE1.frontSightX<
  HK_BARREL_ART['hk-g3-service'].frontSightX-2);
 assert.ok(FAL_STAGE1.frontSightX>FAL_STAGE1.handguardEndX);
 assert.ok(FAL_STAGE1.muzzleX-FAL_STAGE1.frontSightX>=7);
});
test('FAL S1: minimal body is aligned, named and below existing HK budget',()=>{
 const material=new THREE.MeshBasicMaterial();
 const fal=buildFALStage1Silhouette(material);
 const bounds=box(fal);
 assert.ok(Math.abs(bounds.min.x-FAL_STAGE1.stockRearX)<.02);
 assert.ok(Math.abs(bounds.max.x-FAL_STAGE1.muzzleX)<.02);
 assert.ok(bounds.min.y<=FAL_STAGE1.magazineBottomY+.01);
 assert.ok(fal.children.length>=10&&fal.children.length<=22);
 assert.ok(fal.children.every(c=>c.name.startsWith('family-')));
 const raised=buildFALStage1Silhouette(material,{raisedCarryHandle:true});
 assert.equal(raised.children.length,fal.children.length+1);
 assert.ok(box(raised).max.y>box(fal).max.y);
 clearWeaponSilhouette(fal);clearWeaponSilhouette(raised);
 assert.equal(fal.children.length,0);
 material.dispose();
});
test('FAL S1: all three real silhouettes compare at one unmodified art scale',()=>{
 const material=new THREE.MeshBasicMaterial();
 const create=(weapon,preset)=>buildWeaponSilhouette(
  weapon,material,material,
  selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),preset));
 const m4=create('carbine','ar-m4a1');
 const g3=create('rifle','hk-g3a3');
 const fal=buildFALStage1Silhouette(material);
 const width=g=>box(g).max.x-box(g).min.x;
 assert.ok(width(m4)<width(fal),'FAL should exceed M4A1 in length');
 assert.ok(width(fal)<width(g3),'FAL should remain comparable to, not exceed G3');
 for(const g of [m4,g3,fal])clearWeaponSilhouette(g);
 material.dispose();
});
