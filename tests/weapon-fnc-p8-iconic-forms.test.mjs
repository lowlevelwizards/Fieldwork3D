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
test('P17: lower receiver integrates magwell without a standalone hanging frame',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const upper=get(g,'fncP5CrownedReceiver');
 const lower=get(g,'fncAngularLower');
 const seam=get(g,'fncP8UpperLowerSeam');
 const well=get(g,'fncP8DistinctMagwell');
 assert.ok(upper&&lower&&seam&&well);
 assert.equal(Boolean(get(g,'fncP8OpenTriggerGuard')),false);
 assert.ok(g.children.every(x=>!x.name.includes('trigger-guard')));
 assert.ok(box(upper).max.z<box(lower).max.z-.3);
 assert.ok(box(seam).max.z>box(lower).max.z+.05);
 assert.equal(well,lower,'magwell now belongs to ONE contiguous lower receiver mesh');
 assert.ok(box(get(g,'fncGrip')).max.x<box(get(g,'fnc30RoundCurved')).min.x);
 clearWeaponSilhouette(g);m.dispose();
});
test('P8: right-side ejection is BEHIND the charging handle, not vice versa',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const opening=get(g,'fncP8RearPortForwardHandle');
 const knob=get(g,'fncP8ForwardChargingHandle');
 const stem=get(g,'fncP7SlotAnchoredStem');
 assert.ok(opening&&knob&&stem);
 assert.ok(box(opening).min.x<box(knob).min.x-2.5,
  'rear port extends left of forward charging handle');
 assert.ok(box(knob).max.z>box(opening).max.z+1.2);
 assert.ok(box(stem).intersectsBox(box(opening)));
 assert.ok(box(stem).intersectsBox(box(knob)));
 assert.ok(box(stem).intersectsBox(box(get(g,'fncP5CrownedReceiver'))));
 assert.ok(!g.children.some(x=>x.userData.fncLeftChargingHandle));
 clearWeaponSilhouette(g);m.dispose();
});
test('P11: long lower ribs, broken upper gas vents and 5.56 magazine',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const marks=g.children.filter(x=>x.userData.fncP5GrooveLevel);
 assert.equal(marks.length,4);
 for(const side of [-1,1]){
  const rows=marks.filter(x=>x.userData.fncP5GrooveSide===side);
  assert.deepEqual(rows.map(x=>x.userData.fncP5GrooveCount).sort(),[2,2]);
  assert.deepEqual(rows.map(x=>x.userData.fncP6GrooveSegmentsPerRow).sort(),[1,4]);
 }
 assert.equal(get(g,'fncMoldedFlutesPerSide').userData.fncMoldedFlutesPerSide,2);
 const mag=get(g,'fnc556Magazine');
 assert.ok(width(mag)>4.0&&width(mag)<4.3,
  'FNC should use full-size AR STANAG geometry');
 assert.ok(Math.abs(box(mag).min.y-FNC_P1.magazineBottomY)<.03);
 const rear=get(g,'fncP8CompactRearSight'),front=get(g,'fncProtectedFrontSight');
 assert.ok(box(front).max.y>2.70&&box(front).max.y<2.85);
 const muzzle=get(g,'fncP8TaperedMuzzleMass');
 const barrel=get(g,'fncServiceBarrel');
 assert.ok(box(muzzle).max.y-box(muzzle).min.y<
  (box(barrel).max.y-box(barrel).min.y)*1.8);
 assert.ok(Math.abs(box(g).max.x-FNC_P1.muzzleX)<.02);
 assert.ok(Math.abs(box(g).min.x-FNC_P1.stockRearX)<.02);
 clearWeaponSilhouette(g);m.dispose();
});
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
