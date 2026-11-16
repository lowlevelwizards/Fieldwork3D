/** P14: test genuine coordinate seating and art material hierarchy. */
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
import {FAL_DARK_POLYMER,HK_DARK_POLYMER,HK_BLACK_METAL}
 from '../src/weapons/geometry/weapon-visual-palette.ts';

const one=(g,k)=>g.children.find(c=>c.userData[k]);
const all=(g,k)=>g.children.filter(c=>c.userData[k]);
const box=o=>new THREE.Box3().setFromObject(o);
const size=(o,k)=>box(o).max[k]-box(o).min[k];
const touch=(a,b)=>box(a).intersectsBox(box(b));
const close=(a,b,t=.025)=>Math.abs(a-b)<t;

test('P15 receiver and handguard stay in real 3D contact after body shortening',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const poly=one(g,'fncP14ReceiverSeatedPolymer');
 const upper=one(g,'fncP5CrownedReceiver');
 const lower=one(g,'fncAngularLower');
 assert.ok(poly&&upper&&lower);
 assert.ok(close(box(poly).min.x,2.18));
 assert.ok(close(box(upper).max.x,2.75));
 assert.ok(close(box(lower).max.x,2.75));
 assert.ok(box(upper).max.x-box(poly).min.x>.29,
  'no upper-to-handguard longitudinal gap');
 assert.ok(box(lower).max.x-box(poly).min.x>.29,
  'lower receiver also overlaps handguard longitudinally');
 assert.ok(touch(poly,upper)&&touch(poly,lower),
  'the entire parts must share nonzero volume, not merely touch X');
 assert.ok(box(poly).min.y<box(upper).max.y&&
  box(poly).max.y>box(upper).min.y);
 assert.ok(box(poly).min.y<box(lower).max.y&&
  box(poly).max.y>box(lower).min.y);
 clearWeaponSilhouette(g);m.dispose();
});

test('P15 tall gas cover nests into polymer and exposes both vent rows',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const poly=one(g,'fncP14ReceiverSeatedPolymer');
 const metal=one(g,'fncP14LoweredGasCover');
 const vents=all(g,'fncP11BrokenGasSideSlots');
 const roof=one(g,'fncP11TopGasVentRow');
 assert.ok(poly&&metal&&roof);
 assert.ok(close(box(metal).max.y,L.gas.topY));
 assert.ok(box(metal).max.y-box(poly).max.y>.80);
 assert.ok(box(metal).max.y-box(poly).max.y<1.10);
 assert.ok(box(metal).min.y<box(poly).max.y-.80,
  'metal lower flank must sink into polymer');
 assert.ok(size(metal,'z')<size(poly,'z')*.65);
 assert.equal(vents.length,2);
 for(const vent of vents){
  assert.equal(vent.geometry.getAttribute('position').count,60);
  assert.ok(box(vent).min.y>box(poly).max.y+.02,
   'lower vent row remains visibly above polymer roof');
 }
 assert.equal(roof.geometry.getAttribute('position').count,30);
 assert.ok(close(box(roof).max.y,box(metal).max.y+L.gas.ventOffset,.015));
 clearWeaponSilhouette(g);m.dispose();
});

test('P14 front handstop is tapered, compact, and connects to both polymer and gas',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const stop=one(g,'fncP14TaperedMoldedCollar');
 const poly=one(g,'fncP14ReceiverSeatedPolymer');
 const gas=one(g,'fncP14LoweredGasCover');
 assert.ok(stop&&poly&&gas);
 assert.ok(touch(stop,poly)&&touch(stop,gas));
 const p=stop.geometry.getAttribute('position');
 let rear=0,front=0;
 const rearX=L.handstop.centerX-L.handstop.length/2;
 const frontX=L.handstop.centerX+L.handstop.length/2;
 for(let i=0;i<p.count;i++){
  if(close(p.getX(i),rearX))rear=Math.max(rear,Math.abs(p.getZ(i)));
  if(close(p.getX(i),frontX))front=Math.max(front,Math.abs(p.getZ(i)));
 }
 assert.ok(rear>front+.05,'collar MUST taper toward the front end');
 assert.ok(size(stop,'x')<.72&&size(stop,'y')<2.95);
 assert.equal(stop.geometry.type,'BufferGeometry');
 clearWeaponSilhouette(g);m.dispose();
});

test('P14 front base no longer forms a tall pedestal under twin FAL ears',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const base=one(g,'fncP14LowSightBase');
 const gas=one(g,'fncP14LoweredGasCover');
 const ears=all(g,'fncP14ReducedFrontEar');
 const rear=one(g,'fncP8CompactRearSight');
 assert.ok(base&&gas&&rear&&touch(base,gas));
 assert.equal(ears.length,2);
 assert.ok(close(box(base).max.y,1.52));
 assert.ok(size(base,'x')<2.8);
 assert.ok(ears.every(e=>touch(e,base)&&close(box(e).max.y,2.44)));
 assert.ok(box(ears[0]).max.y-box(gas).max.y<1.15,
  'P15 twin ears remain seated within the taller gas/sight structure');
 assert.ok(size(ears[0],'z')<.78);
 clearWeaponSilhouette(g);m.dispose();
});

test('P14 preserves metal/polymer material hierarchy and both muzzle variants',()=>{
 const m=new THREE.MeshBasicMaterial();
 const preset=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const live=buildWeaponSilhouette('rifle',m,m,preset);
 assert.equal(one(live,'fncP14ReceiverSeatedPolymer')?.material,FAL_DARK_POLYMER);
 assert.equal(one(live,'fncP14TaperedMoldedCollar')?.material,FAL_DARK_POLYMER);
 assert.equal(one(live,'fncP14LoweredGasCover')?.material,HK_BLACK_METAL);
 assert.equal(one(live,'fncGrip')?.material,HK_DARK_POLYMER);
 const plain=buildFNCStage1Silhouette(m,{},false);
 assert.ok(!one(plain,'fncMuzzle'));
 assert.ok(close(box(plain).max.x,FNC_P1.muzzleX));
 assert.ok(close(box(live).min.x,FNC_P1.stockRearX));
 assert.ok(one(live,'fncP10DarkThickButtpad'));
 assert.ok(live.children.length<=36);
 clearWeaponSilhouette(live);clearWeaponSilhouette(plain);m.dispose();
});
