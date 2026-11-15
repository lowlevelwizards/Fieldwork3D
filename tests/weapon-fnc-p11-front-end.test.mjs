/** FNC P11: distinct large forms, real 3D continuity and finish constraints. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const get=(g,k)=>g.children.find(x=>x.userData[k]);
const all=(g,k)=>g.children.filter(x=>x.userData[k]);
const box=x=>new THREE.Box3().setFromObject(x);
const size=(g,axis)=>box(g).max[axis]-box(g).min[axis];
const meets=(a,b)=>box(a).intersectsBox(box(b));
test('P15 tall polymer still shorter than elevated gas cover, all parts connected',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const polymer=get(g,'fncP11ShortWidePolymer');
 const gas=get(g,'fncP11LongSlimVentedCover');
 const lip=get(g,'fncP11HandstopLip'),base=get(g,'fncP7ContinuousGasSightSeat');
 assert.ok(polymer&&gas&&lip&&base);
 assert.ok(size(polymer,'x')>8.20&&size(polymer,'x')<8.30);
 assert.ok(size(gas,'x')>11.35&&size(gas,'x')<11.45);
 assert.ok(size(gas,'x')>size(polymer,'x')+3.0);
 assert.ok(size(gas,'z')<size(polymer,'z')*.7);
 assert.ok(meets(polymer,gas)&&meets(gas,base));
 assert.ok(meets(polymer,lip));
 assert.ok(size(lip,'x')>.5&&size(lip,'x')<.6);
 assert.ok(box(lip).min.y<box(polymer).min.y-.045);
 assert.equal(polymer.userData.fncCrossSectionFaces,6);
 clearWeaponSilhouette(g);m.dispose();
});
test('P11 two long handguard ribs, broken gas sides, five upward roof vents',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const marks=all(g,'fncP5GrooveLevel');assert.equal(marks.length,4);
 for(const side of [-1,1]){
  const polymer=marks.find(x=>x.userData.fncP5GrooveSide===side&&x.userData.fncP11PolymerLongRibs);
  const gas=marks.find(x=>x.userData.fncP5GrooveSide===side&&x.userData.fncP11BrokenGasSideSlots);
  assert.ok(polymer&&gas);
  assert.equal(polymer.geometry.getAttribute('position').count,12);
  assert.equal(gas.geometry.getAttribute('position').count,60);
  assert.equal(polymer.userData.fncP6GrooveSegmentsPerRow,1);
  assert.equal(gas.userData.fncP6GrooveSegmentsPerRow,5);
  assert.ok(polymer.geometry.getAttribute('normal').getZ(0)*side>.9);
  assert.ok(gas.geometry.getAttribute('normal').getZ(0)*side>.9);
 }
 const roof=get(g,'fncP11TopGasVentRow');assert.ok(roof);
 assert.equal(roof.userData.fncP11TopGasVentCount,5);
 assert.equal(roof.geometry.getAttribute('position').count,30);
 assert.ok(roof.geometry.getAttribute('normal').getY(0)>.9);
 clearWeaponSilhouette(g);m.dispose();
});
test('P12: two FAL-simple sight ears, real center void and no extra post',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const ears=all(g,'fncP12FALLikeFrontEar');
 const base=get(g,'fncP7ContinuousGasSightSeat');
 assert.equal(ears.length,2);
 assert.deepEqual(ears.map(e=>e.userData.fncP12FALLikeFrontEar).sort(),
  ['left','right']);
 assert.ok(ears.every(e=>e.geometry.type==='BoxGeometry'&&meets(e,base)));
 const [left,right]=ears.slice().sort((a,b)=>box(a).min.z-box(b).min.z);
 assert.ok(box(left).max.z<box(right).min.z-.1,
  'negative space between ears must be genuine');
 assert.ok(ears.every(e=>size(e,'x')<.85&&size(e,'y')<1.8));
 assert.equal(g.children.some(e=>e.userData.fncP11TwinEarFrontSight),false);
 assert.ok(Math.abs(box(g).max.x-FNC_P1.muzzleX)<.02);
 assert.ok(Math.abs(box(g).min.x-FNC_P1.stockRearX)<.02);
 clearWeaponSilhouette(g);m.dispose();
});
test('P11 factory and suppressor appearance retain common anchors and P10 stock',()=>{
 const m=new THREE.MeshBasicMaterial();
 const preset=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const full=buildWeaponSilhouette('rifle',m,m,preset);
 assert.equal(all(full,'fncP12FALLikeFrontEar').length,2);
 assert.ok(get(full,'fncP11TopGasVentRow'));
 assert.ok(get(full,'fncP11HandstopLip'));
 assert.ok(get(full,'fncP10DarkThickButtpad'));
 assert.ok(!get(full,'fncP8OpenTriggerGuard'));
 const bare=buildFNCStage1Silhouette(m,{},false);
 assert.ok(!get(bare,'fncMuzzle'));
 assert.ok(Math.abs(box(bare).max.x-FNC_P1.muzzleX)<.02);
 assert.ok(meets(get(bare,'fncServiceBarrel'),get(bare,'fncP11LongSlimVentedCover')));
 assert.ok(meets(get(bare,'fncServiceBarrel'),get(bare,'fncP7ContinuousGasSightSeat')));
 clearWeaponSilhouette(full);clearWeaponSilhouette(bare);m.dispose();
});
