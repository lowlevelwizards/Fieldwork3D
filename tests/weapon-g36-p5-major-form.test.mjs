/** P5 art invariants: real factory builder, no test-only lookalikes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout,applyG36FactoryMaterials}
 from '../src/weapons/geometry/g36-silhouettes.ts';
import {G36_B_ART as A} from '../src/weapons/geometry/g36-art-layout.ts';
import {G36_LONG_FOREND_RINGS}
 from '../src/weapons/geometry/g36-handguard-profiles.ts';
import {G36_MAG30_CURVE,G36_MAG30_OUTLINE}
 from '../src/weapons/geometry/g36-magazine-profiles.ts';
import {arMagazineCurve,arMagazineOutline}
 from '../src/weapons/geometry/ar-magazine-profiles.ts';
import {G36_E0_FACTORY}
 from '../src/weapons/geometry/g36-family-contract.ts';
import {g36PixelAtlasLayout}
 from '../src/weapons/geometry/g36-pixel-details.ts';
import {weaponFinish}
 from '../src/weapons/geometry/weapon-material-registry.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const one=(g,k)=>g.children.find(x=>x.userData[k]);
const box=x=>new THREE.Box3().setFromObject(x);
const hit=(mesh,x,y)=>new THREE.Raycaster(
 new THREE.Vector3(x,y,9),new THREE.Vector3(0,0,-1))
 .intersectObject(mesh,false).length>0;
test('P5.1: large true handle and two clear downward folding-stock openings',()=>{
 const m=new THREE.MeshBasicMaterial({side:THREE.FrontSide}),g=buildG36OriginalBlockout(m);
 const handle=one(g,'g36HandleOpening'),stock=one(g,'g36MasterStock');
 const pad=one(g,'g36Buttpad'),hinge=one(g,'g36StockHinge');
 assert.equal(handle.geometry.parameters.shapes.holes.length,1);
 assert.equal(stock.geometry.parameters.shapes.holes.length,2);
 for(const [x,y] of [[3,2.58],[-12.5,-1.4],[-8.15,-.92]]){
  assert.ok(!g.children.some(part=>hit(part,x,y)), 'assembled silhouette opening at '+x+','+y);
 }
 assert.ok(hit(handle,3,3.65),'structural thickened handle roof');
 assert.ok(hit(stock,-14.45,-4.8),'descending stock heel remains solid');
 assert.ok(box(pad).intersectsBox(box(stock)));
 assert.ok(box(hinge).intersectsBox(box(stock)));
 assert.ok(box(pad).max.z-box(pad).min.z<1.85);
 assert.ok(Math.abs(box(g).min.x-A.stockRearX)<.01);
 clearWeaponSilhouette(g);m.dispose();
});
test('P5.1: dual optic is one coherent tall stack, not separate floating rails',()=>{
 const m=new THREE.MeshBasicMaterial({side:THREE.FrontSide}),g=buildG36OriginalBlockout(m);
 const frame=one(g,'g36HandleOpening');
 const low=one(g,'g36LowerOptic'),high=one(g,'g36UpperReflex');
 const hiFace=one(g,'g36UpperReflexWindow'),lowFace=one(g,'g36OpticFace');
 for(const part of [low,high,hiFace,lowFace])assert.ok(part);
 assert.ok(box(low).intersectsBox(box(frame)));
 assert.ok(box(high).intersectsBox(box(low)));
 assert.ok(box(hiFace).intersectsBox(box(one(g,'g36UpperReflexBarrel'))));
 assert.ok(box(lowFace).intersectsBox(box(one(g,'g36LowerOpticBarrel'))));
 assert.ok(box(frame).max.z-box(frame).min.z>1.45);
 assert.ok(box(hiFace).min.x<box(high).min.x,'O2 has rear-facing oculars');
 assert.ok(Math.abs(box(g).max.y-A.opticTopY)<.01);
 clearWeaponSilhouette(g);m.dispose();
});
test('P5.2: four sculpted guard sections and broad receiver shoulder with fixed contacts',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const guard=one(g,'g36LongHandguard'),upper=one(g,'g36ReceiverUpper');
 const lower=one(g,'g36ReceiverLower'),grip=one(g,'g36Grip');
 assert.equal(G36_LONG_FOREND_RINGS.length,3,'H1 baseline remains archived for isolated comparison');
 assert.equal(guard.geometry.getAttribute('position').count,258,
  'Live H2.1 eight-corner, five-station angled shell with inset front mouth');
 assert.equal(G36_LONG_FOREND_RINGS[1].halfDepth,G36_LONG_FOREND_RINGS[0].halfDepth,
  'P6 removes pillowing between the first two cross-sections');
 assert.ok(box(guard).intersectsBox(box(upper)));
 assert.ok(box(lower).intersectsBox(box(upper)));
 assert.ok(box(grip).intersectsBox(box(lower)));
 assert.ok(!hit(lower,-2.3,-2.82),'no trigger-guard frame returns');
 assert.ok(Math.abs(box(g).max.x-G36_E0_FACTORY.muzzleX)<.01);
 assert.equal(G36_E0_FACTORY.magazineMouthX,.45);
 clearWeaponSilhouette(g);m.dispose();
});
test('P5.3: G36 uses a distinct, restrained curved-polymer profile, not a STANAG body',()=>{
 const metal=arMagazineCurve('30',.45,-2.62,3.08,1.83);
 assert.deepEqual(G36_MAG30_OUTLINE,arMagazineOutline(G36_MAG30_CURVE));
 assert.ok(G36_MAG30_CURVE.width>metal.width+.15);
 assert.ok(G36_MAG30_CURVE.sweep<metal.sweep-.1);
 assert.ok(G36_MAG30_CURVE.power<metal.power);
 assert.deepEqual(G36_E0_FACTORY.parts.magazine,'g36-mag30');
 assert.equal(G36_E0_FACTORY.feedVisualId,'g36-polymer-556');
 const mag=weaponFinish('g36-smoked-mag');
 const body=weaponFinish('hk-polymer');
 assert.ok(mag.color.getHex()>body.color.getHex());
 assert.ok(mag.metalness<.05);
 const marks=g36PixelAtlasLayout();
 assert.equal(marks.ventsPerSide,4);
 assert.equal(marks.magRibsPerSide,0);
});
