/** P13 visual silhouette criteria (not merely overlapping AABBs). */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_FRONT_P13 as L} from '../src/weapons/geometry/fnc-front-layout.ts';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const one=(g,k)=>g.children.find(x=>x.userData[k]);
const all=(g,k)=>g.children.filter(x=>x.userData[k]);
const box=x=>new THREE.Box3().setFromObject(x);
const size=(x,key)=>box(x).max[key]-box(x).min[key];
const touch=(a,b)=>box(a).intersectsBox(box(b));
const near=(a,b,eps=.025)=>Math.abs(a-b)<eps;

test('P13: authoritative layout controls a longer polymer, still shorter than metal',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const polymer=one(g,'fncP13ExtendedPolymer');
 const gas=one(g,'fncP13NestedFacetedGasCover');
 const collar=one(g,'fncP13MoldedCollar');
 assert.ok(polymer&&gas&&collar);
 assert.ok(near(box(polymer).min.x,L.polymer.startX));
 assert.ok(near(box(polymer).max.x,L.polymer.endX));
 assert.ok(near(box(gas).min.x,L.gas.startX));
 assert.ok(near(box(gas).max.x,L.gas.endX));
 assert.ok(size(polymer,'x')>8.20&&size(polymer,'x')<8.30);
 assert.ok(size(gas,'x')-size(polymer,'x')>3.0);
 assert.ok(size(gas,'z')<size(polymer,'z')*.65);
 assert.ok(touch(polymer,gas)&&touch(gas,collar));
 assert.ok(touch(collar,polymer));
 assert.ok(box(polymer).max.x>box(gas).min.x+5.5,
  'long polymer must genuinely nest under front gas cover');
 clearWeaponSilhouette(g);m.dispose();
});

test('P13: gas cover actually uses a tapered six-sided section, with modest exposed roof',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const poly=one(g,'fncP13ExtendedPolymer');
 const gas=one(g,'fncP13NestedFacetedGasCover');
 assert.equal(gas.geometry.type,'BufferGeometry');
 assert.ok(near(box(gas).max.y,L.gas.topY));
 assert.ok(near(box(gas).min.y,L.gas.bottomY));
 assert.ok(box(gas).max.y-box(poly).max.y>.80);
 assert.ok(box(gas).max.y-box(poly).max.y<1.10,
  'gas cover must read as an integrated raised structure, not a second upper handguard');
 const v=gas.geometry.getAttribute('position');
 const nearTop=[],nearShoulder=[];
 for(let i=0;i<v.count;i++){
  if(near(v.getY(i),L.gas.topY))nearTop.push(Math.abs(v.getZ(i)));
  if(near(v.getY(i),L.gas.shoulderY))nearShoulder.push(Math.abs(v.getZ(i)));
 }
 assert.ok(nearTop.length>0&&nearShoulder.length>0);
 assert.ok(Math.max(...nearTop)<Math.max(...nearShoulder)-.12,
  'roof must actually taper inward at each side');
 clearWeaponSilhouette(g);m.dispose();
});

test('P13: side vents stay EXPOSED ABOVE polymer, top follows actual roof surface',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const poly=one(g,'fncP13ExtendedPolymer');
 const gas=one(g,'fncP13NestedFacetedGasCover');
 const marks=all(g,'fncP11BrokenGasSideSlots');
 const roof=one(g,'fncP11TopGasVentRow');
 assert.equal(marks.length,2);assert.ok(roof);
 assert.equal(roof.geometry.getAttribute('position').count,30);
 assert.ok(near(box(roof).min.y,box(gas).max.y+L.gas.ventOffset,.012));
 for(const mark of marks){
  assert.equal(mark.geometry.getAttribute('position').count,60);
  assert.ok(box(mark).min.y>box(poly).max.y+.02,
   'do not hide gas vents behind the extended polymer');
  assert.ok(box(mark).max.x<box(gas).max.x-.3);
  assert.ok(mark.geometry.getAttribute('normal').getZ(0)*
   mark.userData.fncP5GrooveSide>.9);
 }
 const longGrooves=all(g,'fncP11PolymerLongRibs');
 assert.equal(longGrooves.length,2);
 assert.ok(longGrooves.every(x=>box(x).max.x>L.polymer.fullEndX-.10),
  'two polymer strokes must extend with the resized handguard');
 clearWeaponSilhouette(g);m.dispose();
});

test('P13: one faceted molded handstop sits at the handguard nose, not a plate',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const stop=one(g,'fncP13MoldedCollar');
 const poly=one(g,'fncP13ExtendedPolymer');
 const gas=one(g,'fncP13NestedFacetedGasCover');
 assert.ok(stop&&poly&&gas);
 assert.equal(stop.geometry.type,'BufferGeometry');
 assert.equal(all(g,'fncP13MoldedCollar').length,1);
 assert.ok(near(size(stop,'x'),L.handstop.length));
 assert.ok(box(stop).max.x>box(poly).max.x&&box(stop).max.x<box(poly).max.x+.2);
 assert.ok(size(stop,'y')<2.85&&size(stop,'z')<2.65);
 assert.ok(touch(stop,poly)&&touch(stop,gas));
 clearWeaponSilhouette(g);m.dispose();
});

test('P13: compact integrated sight base and ears; no tall pedestal',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const gas=one(g,'fncP13NestedFacetedGasCover');
 const base=one(g,'fncP13CompactIntegratedSightBase');
 const ears=all(g,'fncP13CompactFrontEar');
 assert.ok(base&&gas&&touch(base,gas));
 assert.equal(ears.length,2);
 assert.ok(near(box(base).min.x,L.sight.baseStartX));
 assert.ok(near(box(base).max.x,L.sight.baseEndX));
 assert.ok(near(box(base).max.y,L.sight.baseRearTopY));
 assert.ok(near(box(base).min.y,L.sight.baseBottomY));
 assert.ok(ears.every(e=>touch(e,base)&&size(e,'y')<1.8));
 assert.ok(ears.every(e=>box(e).max.y<2.7),'ears should no longer tower above entire weapon');
 const ordered=ears.sort((a,b)=>box(a).min.z-box(b).min.z);
 assert.ok(box(ordered[0]).max.z<box(ordered[1]).min.z-.2,
  'clear front-facing sky gap without a modeled inner post');
 assert.ok(box(base).max.y-box(gas).max.y<.65,
  'no tall pedestal between gas roof and ears');
 clearWeaponSilhouette(g);m.dispose();
});

test('P13: retain approved stock, FNC art endpoints, factory/no-muzzle paths and budget',()=>{
 const m=new THREE.MeshBasicMaterial();
 const g=buildFNCStage1Silhouette(m);
 assert.ok(one(g,'fncP10DarkThickButtpad'));
 assert.ok(one(g,'fncP10ContinuousBareUpperRail'));
 assert.ok(near(box(g).min.x,FNC_P1.stockRearX));
 assert.ok(near(box(g).max.x,FNC_P1.muzzleX));
 assert.ok(g.children.length<=36);
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const live=buildWeaponSilhouette('rifle',m,m,cfg);
 assert.ok(one(live,'fncP13NestedFacetedGasCover'));
 assert.ok(one(live,'fncP13CompactIntegratedSightBase'));
 assert.ok(one(live,'fncP13MoldedCollar'));
 const bare=buildFNCStage1Silhouette(m,{},false);
 assert.ok(!one(bare,'fncMuzzle'));
 assert.ok(near(box(bare).max.x,FNC_P1.muzzleX));
 assert.ok(touch(one(bare,'fncServiceBarrel'),one(bare,'fncP13CompactIntegratedSightBase')));
 clearWeaponSilhouette(g);clearWeaponSilhouette(live);
 clearWeaponSilhouette(bare);m.dispose();
});
