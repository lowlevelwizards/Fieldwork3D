import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const bound=g=>new THREE.Box3().setFromObject(g);
const of=(g,k)=>g.children.filter(c=>c.userData[k]);

test('P21 mapped pixel detail preserves FNC P10: grooved forearm and clean open stock without cheek sleeve',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const upper=g.children.find(x=>x.userData.fncPixelOperatingSlot);
 const lower=g.children.find(x=>x.userData.fncPixelReceiverLines);
 const gas=g.children.find(x=>x.userData.fncPixelVentCounts);
 const polymer=g.children.find(x=>x.userData.fncPixelGroovesPerSide);
 const lug=g.children.find(x=>x.userData.fncP20SingleChargingLug);
 assert.ok(upper&&lower&&gas&&polymer&&lug);
 assert.equal(gas.userData.fncPixelVentCounts.left,4);
 assert.equal(gas.userData.fncPixelVentCounts.right,4);
 assert.equal(gas.userData.fncPixelVentCounts.top,4);
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
test('P21 mapped pixel detail preserves FNC P2: asymmetrical receiver port, side handle and left selector',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const upper=g.children.find(x=>x.userData.fncPixelOperatingSlot);
 const lower=g.children.find(x=>x.userData.fncPixelReceiverLines);
 const gas=g.children.find(x=>x.userData.fncPixelVentCounts);
 const polymer=g.children.find(x=>x.userData.fncPixelGroovesPerSide);
 const lug=g.children.find(x=>x.userData.fncP20SingleChargingLug);
 assert.ok(upper&&lower&&gas&&polymer&&lug);
 assert.equal(gas.userData.fncPixelVentCounts.left,4);
 assert.equal(gas.userData.fncPixelVentCounts.right,4);
 assert.equal(gas.userData.fncPixelVentCounts.top,4);
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
test('FNC P2: palette is optional, geometry and bounds unchanged',()=>{
 const m=new THREE.MeshBasicMaterial({color:0x333333});
 const steel=new THREE.MeshBasicMaterial({color:0x777777});
 const guard=new THREE.MeshBasicMaterial({color:0x445544});
 const mono=buildFNCStage1Silhouette(m);
 const painted=buildFNCStage1Silhouette(m,{steel,handguard:guard});
 assert.equal(painted.children.length,mono.children.length);
 const a=bound(mono),b=bound(painted);
 for(const axis of ['x','y','z']){
  assert.ok(Math.abs(a.min[axis]-b.min[axis])<.005);
  assert.ok(Math.abs(a.max[axis]-b.max[axis])<.005);
 }
 assert.ok(Math.abs(a.min.x-FNC_P1.stockRearX)<.02);
 assert.ok(Math.abs(a.max.x-FNC_P1.muzzleX)<.02);
 assert.equal(of(painted,'fncFacetedHandguard')[0].material,guard);
 assert.equal(of(painted,'fncFlatStampedUpper')[0].material,steel);
 assert.ok(mono.children.every(c=>c instanceof THREE.Mesh&&c.material===m));
 clearWeaponSilhouette(mono);clearWeaponSilhouette(painted);
 m.dispose();steel.dispose();guard.dispose();
});
