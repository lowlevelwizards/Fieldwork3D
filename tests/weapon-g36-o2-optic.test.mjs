/** G36 O2: actual production optic, 125 / 125 / 55 approved mockup identity. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout,applyG36FactoryMaterials}
 from '../src/weapons/geometry/g36-silhouettes.ts';
import {G36_B_ART as A} from '../src/weapons/geometry/g36-art-layout.ts';
import {G36_E0_FACTORY as F} from '../src/weapons/geometry/g36-family-contract.ts';
import {weaponFinish} from '../src/weapons/geometry/weapon-material-registry.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
const one=(g,k)=>g.children.find(x=>x.userData[k]);
const bounds=x=>new THREE.Box3().setFromObject(x);
const approx=(a,b,epsilon=.012)=>Math.abs(a-b)<epsilon;
const hitRear=(mesh,x,y)=>new THREE.Raycaster(
 new THREE.Vector3(x,y,0),new THREE.Vector3(1,0,0)
).intersectObject(mesh,false).length>0;

test('O2 production pod: two six-facet housings and retained handle/sight contracts',()=>{
 const mat=new THREE.MeshBasicMaterial({side:THREE.FrontSide});
 const g=buildG36OriginalBlockout(mat);
 const lower=one(g,'g36LowerOptic'),hood=one(g,'g36UpperReflex'),
  handle=one(g,'g36HandleOpening');
 for(const mesh of [lower,hood]){
  assert.equal(mesh.userData.g36OpticArtVersion,'o3-compact-integrated-125-125-55');
  assert.equal(mesh.userData.g36OpticCrossSectionSides,6);
  assert.equal(mesh.geometry.getAttribute('position').count,60,
   'two six-sided stations with flat cap triangles; no micro-detail ladders');
 }
 assert.ok(bounds(lower).intersectsBox(bounds(hood)),'integrated hood not on floating rail');
 assert.ok(bounds(lower).intersectsBox(bounds(handle)),'pod mounted to real handle');
 assert.equal(handle.geometry.parameters.shapes.holes.length,1);
 assert.ok(approx(bounds(g).max.y,A.opticTopY,.001));
 assert.equal(F.integratedOptics,'original-dual');
 assert.equal(F.mountingPolicy,'no-rail-or-duplicate-sights');
 assert.equal(F.lowerSightY,3.57);
 assert.equal(F.upperSightY,4.46);
 assert.ok(approx(bounds(g).min.x,A.stockRearX));
 assert.ok(approx(bounds(g).max.x,A.muzzleX));
 clearWeaponSilhouette(g);mat.dispose();
});

test('O2 lower eight-sided ocular extends further rearward than upper six-sided ocular',()=>{
 const mat=new THREE.MeshBasicMaterial({side:THREE.FrontSide});
 const g=buildG36OriginalBlockout(mat);
 const low=one(g,'g36LowerOpticBarrel'),high=one(g,'g36UpperReflexBarrel');
 const lowShell=one(g,'g36LowerOptic'),highShell=one(g,'g36UpperReflex');
 assert.equal(low.geometry.type,'CylinderGeometry');
 assert.equal(high.geometry.type,'CylinderGeometry');
 assert.equal(low.geometry.parameters.radialSegments,8);
 assert.equal(high.geometry.parameters.radialSegments,6);
 assert.ok(bounds(low).min.x<bounds(high).min.x-.4);
 assert.ok(bounds(low).intersectsBox(bounds(lowShell)));
 assert.ok(bounds(high).intersectsBox(bounds(highShell)));
 assert.ok(bounds(lowShell).max.z-bounds(lowShell).min.z>2.0,
  '125% O3 housing reads as broad in end-on view');
 assert.ok(bounds(low).max.y<4.3,'lower ocular remains below upper hood');
 clearWeaponSilhouette(g);mat.dispose();
});

test('O2 has exactly two rear-facing dark optical faces, no nested disks or dial',()=>{
 const mat=new THREE.MeshBasicMaterial({side:THREE.FrontSide});
 const g=buildG36OriginalBlockout(mat);
 const low=one(g,'g36OpticFace'),high=one(g,'g36UpperReflexWindow');
 for(const face of [low,high]){
  assert.equal(face.geometry.type,'CircleGeometry');
  assert.ok(face.geometry.parameters.segments<=8);
  assert.ok(hitRear(face,face.position.x-8,
   face===low?3.57:4.54),'the optical disc must face the stock/rear');
 }
 assert.ok(bounds(low).intersectsBox(bounds(one(g,'g36LowerOpticBarrel'))));
 assert.ok(bounds(high).intersectsBox(bounds(one(g,'g36UpperReflexBarrel'))));
 assert.equal(g.children.filter(x=>x.userData.g36OpticFace).length,1);
 assert.equal(g.children.filter(x=>x.userData.g36UpperReflexWindow).length,1);
 assert.ok(!g.children.some(x=>x.userData.g36OpticDial));
 const finishes={
  polymer:weaponFinish('hk-polymer'),steel:weaponFinish('hk-steel'),
  magazine:weaponFinish('g36-smoked-mag'),buttpad:weaponFinish('fal-vent-shadow'),
  optic:weaponFinish('hk-polymer'),muzzle:weaponFinish('hk-muzzle-metal')
 };
 applyG36FactoryMaterials(g,finishes);
 assert.equal(low.material,finishes.buttpad);
 assert.equal(high.material,finishes.buttpad);
 assert.equal(one(g,'g36LowerOpticBarrel').material,finishes.optic);
 assert.equal(one(g,'g36UpperReflexBarrel').material,finishes.optic);
 assert.equal(g.children.length,24,'H2.1 adds a mouth cavity and one rear lug, optic unchanged');
 clearWeaponSilhouette(g);mat.dispose();
});

test('O2 legacy art comparisons remain review-only and do not replace factory optic',()=>{
 const mat=new THREE.MeshBasicMaterial();
 const original=buildG36OriginalBlockout(mat);
 for(const variant of ['p6','lower-emphasis','rear-integrated']){
  const lab=buildG36OriginalBlockout(mat,{optic:variant});
  assert.equal(one(lab,'g36LowerOptic').geometry.type,'BoxGeometry');
  assert.ok(!one(lab,'g36LowerOpticBarrel'));
  assert.ok(!one(lab,'g36UpperReflexBarrel'));
  assert.equal(one(lab,'g36HandleOpening').geometry.parameters.shapes.holes.length,1);
  clearWeaponSilhouette(lab);
 }
 assert.equal(one(original,'g36LowerOptic').userData.g36OpticArtVersion,
  'o3-compact-integrated-125-125-55');
 clearWeaponSilhouette(original);mat.dispose();
});
