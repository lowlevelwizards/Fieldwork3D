/** FN FNC P16: complete silhouette checks at actual modular art seams. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_FRONT_P13 as L} from '../src/weapons/geometry/fnc-front-layout.ts';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
const one=(g,k)=>g.children.find(x=>x.userData[k]);
const many=(g,k)=>g.children.filter(x=>x.userData[k]);
const box=o=>new THREE.Box3().setFromObject(o);
const sz=(o,axis)=>box(o).max[axis]-box(o).min[axis];
const near=(a,b,t=.026)=>Math.abs(a-b)<t;
const touch=(a,b)=>box(a).intersectsBox(box(b));
test('P17 integrated lower drops squarely around STANAG, no added magwell slab',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const upper=one(g,'fncP15FlatReceiverNose'),lower=one(g,'fncP15FlatLowerNose');
 const well=one(g,'fncP16IntegratedMagazineSocket');
 const mag=one(g,'fncP16CenteredMagazineSeat');
 assert.ok(upper&&lower&&well&&mag);
 assert.equal(well,lower,'magazine socket should be an uninterrupted lower mesh');
 assert.ok(lower.userData.fncP17SinglePieceMagwell);
 assert.ok(box(well).max.x<=box(upper).max.x+.03);
 assert.ok(touch(well,mag),'30-round magazine must penetrate the lower');
 assert.ok(box(mag).min.x< L.receiver.magazineCenterX);
 assert.ok(box(mag).max.x> L.receiver.magazineCenterX);
 assert.ok(box(mag).max.y> -3.34+.40);
 assert.ok(near(L.receiver.magazineCenterX,1.05));
 assert.ok(near(sz(well,'z'),3.42),
  'integrated magwell must not be the former thick 3.64 unit slab');
 const ribs=many(g,'fncStampedMagazineRib');
 assert.equal(ribs.length,2);
 assert.ok(ribs.every(x=>touch(x,mag)));
 clearWeaponSilhouette(g);m.dispose();
});
test('P21 pixel surface coverage: P16 exposed receiver stamping and selector stay sparse and side-specific',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const upper=g.children.find(x=>x.userData.fncPixelOperatingSlot);
 const lower=g.children.find(x=>x.userData.fncPixelReceiverLines);
 const gas=g.children.find(x=>x.userData.fncPixelVentCounts);
 const polymer=g.children.find(x=>x.userData.fncPixelGroovesPerSide);
 const lug=g.children.find(x=>x.userData.fncP20SingleChargingLug);
 assert.ok(upper&&lower&&gas&&polymer&&lug);
 assert.deepEqual(gas.userData.fncPixelVentCounts,{left:4,right:4,top:4});
 assert.equal(polymer.userData.fncPixelGroovesPerSide,2);
 for(const surface of [upper,lower,gas,polymer]){
  assert.equal(surface.material.userData.fncPixelArt,true);
  assert.ok(surface.material.map instanceof THREE.DataTexture);
  assert.equal(surface.geometry.getAttribute('uv').count,
   surface.geometry.getAttribute('position').count);
 }
 assert.ok(!g.children.some(x=>x.userData.fncP11BrokenGasSideSlots||
  x.userData.fncP8UpperLowerSeam||x.userData.fncP7UnifiedEjectionSlot||
  x.userData.fncP11PolymerLongRibs||x.userData.fncP11TopGasVentRow));
 assert.equal(lug.geometry.type,'BoxGeometry');
 assert.ok(new THREE.Box3().setFromObject(lug).intersectsBox(
  new THREE.Box3().setFromObject(upper)));
 clearWeaponSilhouette(g);m.dispose();
});
test('P21 pixel surface coverage: P16 fore-end roots penetrate both receiver shells without spacer meshes',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const upper=g.children.find(x=>x.userData.fncPixelOperatingSlot);
 const lower=g.children.find(x=>x.userData.fncPixelReceiverLines);
 const gas=g.children.find(x=>x.userData.fncPixelVentCounts);
 const polymer=g.children.find(x=>x.userData.fncPixelGroovesPerSide);
 const lug=g.children.find(x=>x.userData.fncP20SingleChargingLug);
 assert.ok(upper&&lower&&gas&&polymer&&lug);
 assert.deepEqual(gas.userData.fncPixelVentCounts,{left:4,right:4,top:4});
 assert.equal(polymer.userData.fncPixelGroovesPerSide,2);
 for(const surface of [upper,lower,gas,polymer]){
  assert.equal(surface.material.userData.fncPixelArt,true);
  assert.ok(surface.material.map instanceof THREE.DataTexture);
  assert.equal(surface.geometry.getAttribute('uv').count,
   surface.geometry.getAttribute('position').count);
 }
 assert.ok(!g.children.some(x=>x.userData.fncP11BrokenGasSideSlots||
  x.userData.fncP8UpperLowerSeam||x.userData.fncP7UnifiedEjectionSlot||
  x.userData.fncP11PolymerLongRibs||x.userData.fncP11TopGasVentRow));
 assert.equal(lug.geometry.type,'BoxGeometry');
 assert.ok(new THREE.Box3().setFromObject(lug).intersectsBox(
  new THREE.Box3().setFromObject(upper)));
 clearWeaponSilhouette(g);m.dispose();
});
test('P16 twin-ear guards chamfered but keep FAL open silhouette',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const base=one(g,'fncP16CompactGasSightBase');
 const ears=many(g,'fncP16ChamferedSightGuard');
 assert.ok(base);
 assert.equal(ears.length,2);
 assert.ok(ears.every(e=>e.geometry.type==='ExtrudeGeometry'));
 assert.ok(ears.every(e=>touch(e,base)));
 assert.ok(ears.every(e=>near(box(e).max.y,2.77)));
 assert.ok(ears.every(e=>sz(e,'x')<.85&&sz(e,'y')<1.2));
 const sorted=ears.slice().sort((a,b)=>box(a).min.z-box(b).min.z);
 assert.ok(box(sorted[0]).max.z<box(sorted[1]).min.z-.30);
 assert.ok(box(base).max.y<1.95);
 assert.ok(!one(g,'fncP11TwinEarFrontSight'));
 clearWeaponSilhouette(g);m.dispose();
});
test('P16 factory device is narrower, slotted, and removed for suppressed path',()=>{
 const m=new THREE.MeshBasicMaterial(),factory=buildFNCStage1Silhouette(m);
 const device=one(factory,'fncP16SlenderFNCFlashHider'),
  slots=one(factory,'fncP16MuzzleSlotStrip'),
  barrel=one(factory,'fncServiceBarrel');
 assert.ok(device&&slots&&barrel);
 assert.ok(near(box(device).max.x,19.50));
 assert.ok(sz(device,'y')>2.0&&sz(device,'y')<2.15);
 assert.equal(slots.geometry.getAttribute('position').count,24);
 assert.ok(box(slots).min.x>=box(device).min.x+.3);
 assert.ok(box(slots).max.x<=box(device).max.x-.15);
 assert.ok(touch(device,barrel));
 const bare=buildFNCStage1Silhouette(m,{},false);
 assert.ok(!one(bare,'fncP16SlenderFNCFlashHider'));
 assert.ok(!one(bare,'fncP16MuzzleSlotStrip'));
 assert.ok(near(box(bare).max.x,FNC_P1.muzzleX));
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const resolved=resolveWeaponAssembly(cfg);
 assert.equal(resolved.muzzleY,0);assert.ok(near(resolved.muzzleX,19.5));
 clearWeaponSilhouette(factory);clearWeaponSilhouette(bare);m.dispose();
});
test('P16 low-poly factory assembly and approved stock/hands stay stable',()=>{
 const m=new THREE.MeshBasicMaterial(),
 cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service'),
 g=buildWeaponSilhouette('rifle',m,m,cfg);
 assert.ok(g.children.length<=36);
 assert.ok(one(g,'fncP10DarkThickButtpad'));
 assert.ok(one(g,'fncP10ContinuousBareUpperRail'));
 assert.ok(one(g,'fncGrip'));
 assert.equal(many(g,'fncP12FALLikeFrontEar').length,2);
 assert.equal(Boolean(one(g,'fncP8OpenTriggerGuard')),false);
 assert.ok(near(box(g).min.x,FNC_P1.stockRearX));
 assert.ok(near(box(g).max.x,FNC_P1.muzzleX));
 const a=resolveWeaponAssembly(cfg),grip=one(g,'fncGrip');
 assert.ok(a.primaryX>box(grip).min.x&&a.primaryX<box(grip).max.x);
 clearWeaponSilhouette(g);m.dispose();
});
