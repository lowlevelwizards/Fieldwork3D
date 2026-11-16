/** P18 visual-size gate: force a meaningful FNC silhouette change, not tiny tweaks. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_FRONT_P13 as L} from '../src/weapons/geometry/fnc-front-layout.ts';
import {buildFNCStage1Silhouette,FNC_P1} from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
const one=(g,k)=>g.children.find(c=>c.userData[k]);
const many=(g,k)=>g.children.filter(c=>c.userData[k]);
const box=c=>new THREE.Box3().setFromObject(c);
const size=(c,a)=>box(c).max[a]-box(c).min[a];
const near=(a,b,t=.026)=>Math.abs(a-b)<t;
test('P18 receiver gains a clearly square heavy upper and a single angular mag shroud',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const upper=one(g,'fncP18BroadStampedUpper'),lower=one(g,'fncP18SquaredMagazineHousing');
 const mag=one(g,'fnc30RoundCurved');
 assert.ok(upper&&lower&&mag);
 assert.ok(near(box(upper).max.y,1.93));
 assert.ok(near(box(lower).min.y,-3.46));
 assert.ok(size(upper,'y')>3.0,'receiver vertical envelope must visibly expand');
 assert.ok(near(upper.userData.fncP5RoofHalfWidth,.88));
 assert.ok(size(upper,'z')<size(lower,'z')-.55,'lower must remain proud of upper');
 assert.ok(box(mag).max.y>box(lower).min.y+.7);
 assert.ok(box(mag).intersectsBox(box(lower)));
 assert.equal(many(g,'fncP17SinglePieceMagwell').length,1);
 assert.ok(!g.children.some(x=>x!==lower&&x.name.includes('magwell')));
 clearWeaponSilhouette(g);m.dispose();
});
test('P18 polymer front and depth make substantial difference at native scale',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const poly=one(g,'fncP18MonumentalPolymer'),gas=one(g,'fncP18RaisedFourVentSpine'),
  lip=one(g,'fncP18DeepEndLip');
 assert.ok(poly&&gas&&lip);
 assert.ok(near(box(poly).max.x,11.68)&&near(box(poly).min.x,1.95));
 assert.ok(size(poly,'y')>3.35&&size(poly,'y')<3.5);
 assert.ok(size(poly,'y')/2.70>1.22,'P18 must exceed P17 polymer size by 22%');
 assert.ok(size(poly,'z')/2.47>1.20,'P18 handguard must broaden in three-quarter views');
 assert.ok(near(box(gas).max.y,1.85));
 assert.ok(box(gas).max.y-box(poly).max.y>1.2);
 assert.ok(box(poly).intersectsBox(box(gas)));
 assert.ok(box(poly).intersectsBox(box(lip)));
 assert.ok(near(size(lip,'x'),.88));
 assert.ok(box(lip).max.x>box(poly).max.x);
 assert.ok(box(lip).max.x<box(poly).max.x+.18);
 clearWeaponSilhouette(g);m.dispose();
});
test('P18 vent language shifts from five micro strokes to four large groups',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 assert.equal(L.gas.ventCount,4);
 assert.ok(L.gas.ventLength/1.06>1.4);
 assert.ok(L.gas.ventHeight/.205>1.45);
 const gas=many(g,'fncP11BrokenGasSideSlots'),
   grooves=many(g,'fncP11PolymerLongRibs'),
   roof=one(g,'fncP11TopGasVentRow');
 assert.equal(gas.length,2);assert.equal(grooves.length,2);
 assert.ok(gas.every(c=>c.geometry.getAttribute('position').count===48));
 assert.equal(roof.geometry.getAttribute('position').count,24);
 assert.ok(grooves.every(c=>size(c,'x')>6.8));
 clearWeaponSilhouette(g);m.dispose();
});
test('P18 heavy stock, rear sight, barrel and stubby muzzle have real silhouette impact',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const pad=one(g,'fncP18OversizedButtpad'),rear=one(g,'fncP18BoldRearSight'),
  barrel=one(g,'fncP18HeavyBarrel'),muzzle=one(g,'fncP18StubbyMuzzle');
 assert.ok(pad&&rear&&barrel&&muzzle);
 assert.ok(size(pad,'y')/4.12>1.20);
 assert.ok(near(box(pad).min.x,FNC_P1.stockRearX));
 assert.ok(near(box(rear).max.y,3.06));
 assert.ok(size(rear,'x')/1.52>1.17);
 assert.ok(size(muzzle,'y')/1.60>1.25);
 assert.ok(size(muzzle,'x')<1.4);
 assert.ok(near(size(barrel,'y'),1.34));
 assert.ok(near(box(muzzle).max.x,FNC_P1.muzzleX));
 assert.ok(many(g,'fncP16ChamferedSightGuard').length===2);
 clearWeaponSilhouette(g);m.dispose();
});
test('P18 bore, primary hand and magazine identity must remain safe',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const bare=buildFNCStage1Silhouette(m,{},false);
 assert.ok(near(box(g).min.x,FNC_P1.stockRearX));
 assert.ok(near(box(g).max.x,FNC_P1.muzzleX));
 assert.ok(near(box(bare).max.x,FNC_P1.muzzleX));
 assert.equal(Boolean(one(bare,'fncP18StubbyMuzzle')),false);
 assert.equal(Boolean(one(bare,'fncP17ProjectedMuzzleSlots')),false);
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const resolved=resolveWeaponAssembly(cfg);
 assert.ok(near(resolved.muzzleX,19.50));
 assert.equal(resolved.muzzleY,0);
 const grip=one(g,'fncGrip');
 assert.ok(resolved.primaryX>box(grip).min.x&&resolved.primaryX<box(grip).max.x);
 assert.equal(many(g,'fncStampedMagazineRib').length,2);
 assert.ok(g.children.length<=34);
 clearWeaponSilhouette(g);clearWeaponSilhouette(bare);m.dispose();
});
