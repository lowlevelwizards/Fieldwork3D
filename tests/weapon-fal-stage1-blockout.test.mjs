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
 assert.equal(raised.children.length,fal.children.length+2);
 assert.ok(raised.children.some(c=>c.userData.falCarrySupport),
  'carry support remains a single simple steel shape');
 assert.ok(raised.children.some(c=>c.userData.falCarryGrip),
  'separate horizontal carrying grip, not a rectangular handle frame');
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

test('FAL S1C: reference-led proportions preserve key FAL forms',()=>{
 const material=new THREE.MeshBasicMaterial(),g=buildFALStage1Silhouette(material);
 const byName=(name)=>{
  const mesh=g.children.find(child=>child.name===name);
  assert.ok(mesh,'Missing shape '+name);
  return new THREE.Box3().setFromObject(mesh);
 };
 const stock=byName('family-stock-fal-stage1-stock-0');
 const grip=byName('family-grip-fal-stage1-grip-0');
 const handguard=byName('family-handguard-fal-stage1-handguard-0');
 const ears=byName('family-barrel-fal-stage1-barrel-2');
 const receiver=byName('family-receiver-fal-stage1-receiver-0');
 assert.ok(stock.max.y>=.70&&stock.max.y<=.75,'stock comb drops toward the butt');
 assert.ok(stock.min.y>=-4.13&&stock.min.y<=-4.04,'P8 stock heel is broad and extended downward');
 assert.ok(grip.min.x>=-6.56&&grip.min.x<=-6.48,'P8 grip sweeps further backward');
 assert.ok(grip.min.y>=-5.89&&grip.min.y<=-5.81,'P8 grip is shorter and sharply raked');
 assert.ok(handguard.max.y>=1.85&&handguard.max.y<=1.95&&
  handguard.min.y>=-1.60&&handguard.min.y<=-1.52,
  'P6 fore-end is deliberately tall with unmistakable FAL tapered shoulders');
 assert.ok(ears.max.y>=3.13&&ears.max.y<=3.21,'P8 front sight ears are exaggerated and bold');
 assert.ok(receiver.max.y>=1.52&&receiver.max.y<=1.58,'P8 receiver is lower than handguard');
 assert.equal(g.children.length,18,'P7: fewer receiver features and purposeful muzzle silhouette');
 clearWeaponSilhouette(g);material.dispose();
});
