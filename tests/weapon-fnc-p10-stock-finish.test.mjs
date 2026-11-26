/** FN FNC P10 — audited stock-only geometry/material acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_P1,buildFNCStage1Silhouette} from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {FNC_BLACK_METAL,FNC_DARK_POLYMER}
 from '../src/weapons/geometry/weapon-visual-palette.ts';

const box=x=>new THREE.Box3().setFromObject(x);
const get=(g,key)=>g.children.find(c=>c.userData[key]);
const size=(g,key)=>{const b=box(g);return b.max[key]-b.min[key];};
const intersect=(a,b)=>box(a).intersectsBox(box(b));

test('P10: cheek sleeve deleted, continuous bare metal upper rail retains all connections',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const upper=get(g,'fncP10ContinuousBareUpperRail');
 const lower=get(g,'fncP9ParallelThenAngled'),pad=get(g,'fncP10DarkThickButtpad');
 const hinge=get(g,'fncP10RefinedHinge'),plate=get(g,'fncP10LongThinConnector');
 assert.ok(upper&&lower&&pad&&hinge&&plate);
 assert.equal(Boolean(get(g,'fncCheekSleeve')),false);
 assert.equal(g.children.filter(x=>x.userData.fncStockRail===true).length,2);
 assert.ok(size(upper,'x')>7.5 && size(upper,'x')<8.3);
 assert.ok(intersect(upper,hinge)&&intersect(upper,pad));
 assert.ok(intersect(plate,upper)&&intersect(plate,lower));
 assert.ok(box(upper).min.y>box(lower).max.y+.20);
 assert.ok(Math.abs(box(g).min.x-FNC_P1.stockRearX)<.02);
 clearWeaponSilhouette(g);m.dispose();
});

test('P10: hinge is longer and taller but slimmer than P9; buttpad thicker',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const hinge=get(g,'fncP10RefinedHinge'),pad=get(g,'fncP10DarkThickButtpad');
 const lower=get(g,'fncP9ParallelThenAngled');
 assert.ok(hinge&&pad&&lower);
 assert.ok(size(hinge,'x')>1.45&&size(hinge,'x')<1.60);
 assert.ok(size(hinge,'y')>3.17&&size(hinge,'y')<3.23);
 assert.ok(size(hinge,'z')>1.60&&size(hinge,'z')<1.75);
 assert.ok(size(hinge,'z')>size(lower,'z')+.4);
 assert.ok(size(pad,'z')>2.15&&size(pad,'z')<2.25);
 assert.ok(intersect(hinge,lower)&&intersect(pad,lower));
 assert.ok(Math.abs(box(pad).min.x-FNC_P1.stockRearX)<.02);
 clearWeaponSilhouette(g);m.dispose();
});

test('P10: middle sheet longer along X, thinner along Z, still connects both rails',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const plate=get(g,'fncP10LongThinConnector');
 const top=get(g,'fncP10ContinuousBareUpperRail');
 const lower=get(g,'fncP9ParallelThenAngled');
 assert.ok(plate&&top&&lower);
 assert.ok(size(plate,'x')>3.5&&size(plate,'x')<3.8);
 assert.ok(size(plate,'z')>.58&&size(plate,'z')<.70);
 assert.ok(size(plate,'z')<size(lower,'z')-.25);
 assert.ok(box(plate).max.z<box(top).max.z-.15);
 assert.ok(intersect(plate,top)&&intersect(plate,lower));
 assert.ok(box(plate).min.x>box(lower).min.x+.70,
  'connector remains within large stock opening');
 clearWeaponSilhouette(g);m.dispose();
});
test('P10: factory butt gets former cheek polymer finish, all other stock beams stay steel',()=>{
 const m=new THREE.MeshBasicMaterial();
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const factory=buildWeaponSilhouette('rifle',m,m,cfg);
 const top=get(factory,'fncP10ContinuousBareUpperRail');
 const butt=get(factory,'fncP10DarkThickButtpad');
 const hinge=get(factory,'fncP10RefinedHinge');
 const sheet=get(factory,'fncP10LongThinConnector');
 assert.equal(top?.material,FNC_BLACK_METAL);
 assert.equal(hinge?.material,FNC_BLACK_METAL);
 assert.equal(sheet?.material,FNC_BLACK_METAL);
 assert.equal(butt?.material,FNC_DARK_POLYMER);
 assert.equal(Boolean(get(factory,'fncCheekSleeve')),false);
 assert.equal(Boolean(get(factory,'fncP8OpenTriggerGuard')),false);
 assert.ok(factory.children.every(x=>x.name.startsWith('family-')));
 const bare=buildFNCStage1Silhouette(m,{},false);
 assert.ok(!get(bare,'fncMuzzle'));
 assert.ok(Math.abs(box(bare).max.x-FNC_P1.muzzleX)<.02);
 clearWeaponSilhouette(factory);clearWeaponSilhouette(bare);m.dispose();
});
