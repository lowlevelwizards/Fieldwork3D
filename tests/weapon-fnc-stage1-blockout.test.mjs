import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_P1,buildFNCStage1Silhouette}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';

const box=g=>new THREE.Box3().setFromObject(g);
const width=g=>box(g).max.x-box(g).min.x;
test('FNC P1: independent stock, barrel and handguard silhouette landmarks',()=>{
 const material=new THREE.MeshBasicMaterial();
 const g=buildFNCStage1Silhouette(material),b=box(g);
 assert.ok(Math.abs(b.min.x-FNC_P1.stockRearX)<.02);
 assert.ok(Math.abs(b.max.x-FNC_P1.muzzleX)<.02);
 assert.ok(b.min.y<=FNC_P1.magazineBottomY+.01);
 assert.ok(FNC_P1.frontSightX>FNC_P1.handguardEndX+1);
 assert.ok(FNC_P1.muzzleX>FNC_P1.frontSightX+6);
 assert.ok(g.children.length>=15&&g.children.length<=25);
 assert.ok(g.children.every(c=>c.name.startsWith('family-')));
 assert.equal(g.children.filter(c=>c.userData.fncStockRail).length,2);
 assert.equal(g.children.filter(c=>c.userData.fncLongGroovedHandguard).length,1);
 assert.equal(g.children.filter(c=>c.userData.fncSingleHandguardGroove).length,1);
 assert.equal(g.children.filter(c=>c.userData.fnc556Magazine).length,1);
 assert.equal(g.children.filter(c=>c.userData.fncFlatStampedUpper).length,1);
 assert.ok(!g.children.some(c=>c.userData.falCrownedUpper),
  'FNC must not reuse the FAL roof or receiver');
 const triangleCount=g.children.reduce((count,c)=>{
  if(!(c instanceof THREE.Mesh))return count;
  return count+(c.geometry.index?.count??
   c.geometry.getAttribute('position').count)/3;
 },0);
 assert.ok(triangleCount<550,'P1 should stay under a compact inspection budget');
 clearWeaponSilhouette(g);assert.equal(g.children.length,0);
 material.dispose();
});
test('FNC P1: truly open rail stock with clear butt and receiver anchor',()=>{
 const material=new THREE.MeshBasicMaterial();
 const g=buildFNCStage1Silhouette(material);
 const rails=g.children.filter(c=>c.userData.fncStockRail);
 assert.equal(rails.length,2);
 const top=box(rails[0]),lower=box(rails[1]);
 assert.ok(top.min.y>lower.max.y+.2,'not a filled-in FAL style fixed stock');
 assert.ok(g.children.some(c=>c.userData.fncStockHinge));
 assert.ok(g.children.some(c=>c.userData.fncButtPlate));
 clearWeaponSilhouette(g);material.dispose();
});
test('FNC P1: equal-scale comparison is real production art, not a replacement',()=>{
 const material=new THREE.MeshBasicMaterial();
 const g=buildFNCStage1Silhouette(material);
 const ids=['fal-5000','hk-g3a3','ak-ak74','ar-m16a2'];
 const competitors=ids.map(id=>buildWeaponSilhouette('rifle',material,material,
  selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),id)));
 const all=[g,...competitors];
 assert.ok(all.every(model=>Number.isFinite(width(model))&&width(model)>25));
 assert.ok(all.every(model=>box(model).max.y-box(model).min.y>5));
 assert.ok(Math.abs(width(g)-width(competitors[0]))>.1,
  'FNC must not be the original FAL width');
 assert.ok(!FAMILY_PRESETS.some(p=>p.id.startsWith('fnc-')),
  'review-only blockout must not appear as a live loadout preset');
 all.forEach(clearWeaponSilhouette);material.dispose();
});
