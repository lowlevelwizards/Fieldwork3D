/** FNC P3 Fieldwork identity: shape and regression gates at factory scale. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {HK556_MAG_METAL,HK556_MAG_RIB}
 from '../src/weapons/geometry/weapon-visual-palette.ts';

const box=x=>new THREE.Box3().setFromObject(x);
const where=(g,k)=>g.children.filter(x=>x.userData[k]);
const factory=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
test('P3A: insulated stock is segmented, not drawn coplanar over metal stock',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const rails=where(g,'fncStockRail').filter(x=>x.userData.fncStockRail===true);
 const [cheek]=where(g,'fncCheekSleeve');
 assert.equal(rails.length,2);
 assert.equal(where(g,'fncKinkedLowerRail').length,1);
 assert.equal(where(g,'fncNoCoplanarRail').length,1);
 const top=box(rails[0]),sleeve=box(cheek);
 assert.ok(top.min.x>=sleeve.max.x-.03,
  'upper steel rail must end at the cheek sleeve instead of running underneath it');
 assert.ok(top.min.y>box(rails[1]).max.y+.2,'stock opening must remain visible');
 assert.ok(Math.abs(box(g).min.x-FNC_P1.stockRearX)<.02);
 clearWeaponSilhouette(g);m.dispose();
});
test('P3A: independent upper gas cover, three bold vents per side, fuller belly',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 assert.equal(where(g,'fncP3FullerBelly').length,1);
 assert.equal(where(g,'fncDistinctGasCover').length,1);
 assert.deepEqual(where(g,'fncGasVentSide').map(x=>x.userData.fncGasVentSide).sort(),[-1,1]);
 assert.ok(where(g,'fncGasVentSide').every(x=>x.userData.fncGasVentCount===3));
 assert.equal(where(g,'fncGrooveSide').length,2);
 assert.equal(where(g,'fncCrossSectionFaces')[0].userData.fncCrossSectionFaces,8);
 assert.ok(box(where(g,'fncDistinctGasCover')[0]).max.y>
  box(where(g,'fncP3FullerBelly')[0]).max.y+.3);
 clearWeaponSilhouette(g);m.dispose();
});
test('P3B: signed rear/front guards, hex receiver controls and compact muzzle',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 assert.equal(where(g,'fncFrontSightEar').length,2);
 assert.equal(where(g,'fncSweptFrontEar').length,2);
 assert.equal(where(g,'fncRearSightEar').length,2);
 assert.equal(where(g,'fncSixFacetedHandle').length,1);
 assert.equal(where(g,'fncSixFaceMuzzle').length,1);
 assert.equal(where(g,'fncMuzzleSlot').length,1);
 assert.equal(where(g,'fncStampedCover').length,0,'receiver roof must not add a covering box');
 assert.equal(where(g,'fncMagwellLip').length,1,'lower magwell must be integrated');
 assert.ok(where(g,'fncRearSightEar').every(x=>box(x).max.y<2.6));
 const body=box(g);
 assert.ok(Math.abs(body.min.x-FNC_P1.stockRearX)<.02);
 assert.ok(Math.abs(body.max.x-FNC_P1.muzzleX)<.02);
 clearWeaponSilhouette(g);m.dispose();
});
test('P3C: live factory art shares the dark HK 5.56 magazine precedents',()=>{
 const m=new THREE.MeshBasicMaterial();
 const g=buildWeaponSilhouette('rifle',m,m,factory());
 const mag=where(g,'fnc556Magazine')[0];
 const rib=where(g,'fncStampedMagazineRib')[0];
 assert.ok(mag&&rib);
 assert.equal(mag.material,HK556_MAG_METAL);
 assert.equal(rib.material,HK556_MAG_RIB);
 assert.equal(where(g,'fncNoCoplanarRail').length,1);
 const tri=g.children.reduce((n,x)=>n+
  (x.geometry?.index?.count??x.geometry?.getAttribute('position')?.count??0)/3,0);
 assert.ok(g.children.length<=36,'no uncontrolled mesh proliferation');
 assert.ok(tri<1250,'keep stylized low-poly budget bounded');
 clearWeaponSilhouette(g);m.dispose();
});
