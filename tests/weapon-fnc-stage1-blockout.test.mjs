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
 assert.ok(FNC_P1.muzzleX>FNC_P1.frontSightX+4);
 assert.ok(g.children.length>=19&&g.children.length<=28);
 assert.ok(g.children.every(c=>c.name.startsWith('family-')));
 assert.equal(g.children.filter(c=>c.userData.fncStockRail).length,2);
 assert.equal(g.children.filter(c=>c.userData.fncLongGroovedHandguard).length,1);
 assert.equal(g.children.filter(c=>c.userData.fncVentSide).length,2);
 assert.equal(g.children.filter(c=>c.userData.fnc556Magazine).length,1);
 assert.equal(g.children.filter(c=>c.userData.fncFlatStampedUpper).length,1);
 assert.ok(!g.children.some(c=>c.userData.falCrownedUpper),
  'FNC must not reuse the FAL roof or receiver');
 const triangleCount=g.children.reduce((count,c)=>{
  if(!(c instanceof THREE.Mesh))return count;
  return count+(c.geometry.index?.count??
   c.geometry.getAttribute('position').count)/3;
 },0);
 assert.ok(triangleCount<950,'P2 must retain a compact exterior budget');
 clearWeaponSilhouette(g);assert.equal(g.children.length,0);
 material.dispose();
});
test('FNC P1B: 30-round magazine curve and visible barrel weight survive geometry build',()=>{
 const material=new THREE.MeshBasicMaterial();
 const g=buildFNCStage1Silhouette(material);
 const mag=g.children.find(c=>c.userData.fnc30RoundCurved);
 const barrel=g.children.find(c=>c.userData.fncServiceBarrel);
 assert.ok(mag&&barrel,'P1B curved STANAG and service barrel must be separate');
 const mb=box(mag),bb=box(barrel);
 assert.ok(mb.max.x-mb.min.x<3.3,'STANAG magazine must not become FAL-wide');
 assert.ok(Math.abs(mb.min.y-FNC_P1.magazineBottomY)<.02,'updated magazine extends to authored datum');
 assert.ok(bb.max.y-bb.min.y>.90,'barrel not a .66 pencil-thin wire');
 assert.ok(bb.max.y-bb.min.y<1.05,'still a visually slimmer barrel than handguard');
 assert.ok((FNC_P1.muzzleX-FNC_P1.stockRearX)<35,
  'FNC must be visually shorter than legacy 36.4-unit blockout');
 clearWeaponSilhouette(g);material.dispose();
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
 assert.ok(width(g)<width(competitors[0])*.95,
  'FNC full-size must read visibly shorter than the standard FAL');
 assert.ok(FAMILY_PRESETS.some(p=>p.id==='fnc-service'),
  'approved P2 FNC must now exist as a genuine factory rifle preset');
 all.forEach(clearWeaponSilhouette);material.dispose();
});
