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
import {FAL_DARK_POLYMER,FNC_DARK_POLYMER,FNC_BLACK_METAL}
 from '../src/weapons/geometry/weapon-visual-palette.ts';

const one=(g,k)=>g.children.find(c=>c.userData[k]);
const all=(g,k)=>g.children.filter(c=>c.userData[k]);
const box=o=>new THREE.Box3().setFromObject(o);
const size=(o,k)=>box(o).max[k]-box(o).min[k];
const touch=(a,b)=>box(a).intersectsBox(box(b));
const close=(a,b,t=.025)=>Math.abs(a-b)<t;

test('P22 narrow metal neck bridges a deliberately exposed receiver-handguard gap',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const poly=one(g,'fncP14ReceiverSeatedPolymer');
 const upper=one(g,'fncP5CrownedReceiver');
 const lower=one(g,'fncAngularLower');
 const gas=one(g,'fncP22ContinuousGasBlock');
 assert.ok(poly&&upper&&lower&&gas);
 assert.ok(close(box(poly).min.x,3.25));
 assert.ok(close(box(upper).max.x,2.75));
 assert.ok(close(box(lower).max.x,2.75));
 assert.ok(box(poly).min.x-box(upper).max.x>.45,
  'the upper-to-polymer gap must be visibly open');
 assert.ok(box(poly).min.x>box(lower).max.x,
  'lower is not stretched into the polymer');
 assert.ok(touch(gas,upper)&&touch(gas,poly),
  'gas housing physically bridges the separated shapes');
 assert.ok(box(poly).min.y<box(upper).max.y&&
  box(poly).max.y>box(upper).min.y);
 assert.ok(box(poly).min.y<box(lower).max.y&&
  box(poly).max.y>box(lower).min.y);
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
 assert.ok(size(stop,'x')<.90&&size(stop,'y')<4.05);
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
 assert.ok(close(box(base).max.y,1.50));
 assert.equal(base,gas,'no extra sight-base mesh');
 assert.ok(size(base,'x')>13.0&&size(base,'x')<13.3);
 assert.ok(ears.every(e=>touch(e,base)&&close(box(e).max.y,2.42)));
 assert.ok(box(ears[0]).max.y-box(gas).max.y<1.15,
  'P15 twin ears remain seated within the taller gas/sight structure');
 assert.ok(size(ears[0],'z')<.78);
 clearWeaponSilhouette(g);m.dispose();
});

test('P14 preserves metal/polymer material hierarchy and both muzzle variants',()=>{
 const m=new THREE.MeshBasicMaterial();
 const preset=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const live=buildWeaponSilhouette('rifle',m,m,preset);
 assert.equal(one(live,'fncP14ReceiverSeatedPolymer')?.material.color.getHex(),FAL_DARK_POLYMER.color.getHex());
 assert.ok(one(live,'fncP14ReceiverSeatedPolymer')?.material.map,'polymer remains textured');
 assert.equal(one(live,'fncP14TaperedMoldedCollar')?.material,FAL_DARK_POLYMER);
 assert.equal(one(live,'fncP14LoweredGasCover')?.material.color.getHex(),FNC_BLACK_METAL.color.getHex());
 assert.ok(one(live,'fncP14LoweredGasCover')?.material.map,'gas retains 12 pixel vents');
 assert.equal(one(live,'fncGrip')?.material,FNC_DARK_POLYMER);
 const plain=buildFNCStage1Silhouette(m,{},false);
 assert.ok(!one(plain,'fncMuzzle'));
 assert.ok(close(box(plain).max.x,FNC_P1.muzzleX));
 assert.ok(close(box(live).min.x,FNC_P1.stockRearX));
 assert.ok(one(live,'fncP10DarkThickButtpad'));
 assert.ok(live.children.length<=36);
 clearWeaponSilhouette(live);clearWeaponSilhouette(plain);m.dispose();
});
