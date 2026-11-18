/** R2 G36 production art acceptance: every modeled face must carry an identity. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout,applyG36FactoryMaterials}
 from '../src/weapons/geometry/g36-silhouettes.ts';
import {addG36Family} from '../src/weapons/geometry/g36-family-silhouettes.ts';
import {G36_E0_FACTORY as F} from '../src/weapons/geometry/g36-family-contract.ts';
import {G36_B_ART as A} from '../src/weapons/geometry/g36-art-layout.ts';
import {G36_R1_OPTIC_LIFT_Y,G36_R2_OPTIC_LIFT_Y}
 from '../src/weapons/geometry/g36-dual-optic-o2.ts';
import {G36_MAG30_CURVE,G36_MAG30_DEPTH}
 from '../src/weapons/geometry/g36-magazine-profiles.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const one=(g,k)=>g.children.find(m=>m.userData[k]);
const all=(g,k)=>g.children.filter(m=>m.userData[k]);
const box=m=>new THREE.Box3().setFromObject(m);
const approx=(a,b,t=.015)=>Math.abs(a-b)<t;
const tris=m=>(m.geometry.index?.count??m.geometry.getAttribute('position').count)/3;
const sceneTris=g=>g.children.reduce((n,m)=>n+tris(m),0);

test('R2 receiver closes H3 notch with an overlapping single upper, not a filler mesh',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const upper=one(g,'g36ReceiverUpper'),guard=one(g,'g36LongHandguard');
 const b=box(upper),h=box(guard);
 assert.equal(upper.userData.g36ReceiverArtVersion,'r2-broad-interlocking-upper');
 assert.ok(approx(b.max.x,4.90));
 assert.ok(b.max.x>4.35,'upper extends beyond guard rear roof x');
 assert.ok(b.min.z< h.max.z&&b.max.z>h.min.z);
 assert.ok(b.intersectsBox(h));
 assert.equal(all(g,'g36LongHandguard').length,1);
 assert.equal(guard.userData.g36HandguardArtVersion,'h3-six-sided-solid');
 assert.equal(tris(guard),20);
 assert.ok(tris(upper)<=20);
 clearWeaponSilhouette(g);m.dispose();
});

test('R2 angled 5.56 magwell physically surrounds the EXISTING 30-round mouth',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const well=one(g,'g36ReceiverLower'),mag=one(g,'g36Magazine');
 const pts=well.geometry.parameters.shapes.getPoints().slice(0,-1);
 assert.equal(pts.length,8,'only eight purposeful contour corners');
 assert.equal(well.userData.g36MagwellArtVersion,'r2-556-angled-funnel');
 assert.ok(well.userData.g36MagwellMouthWidth>=G36_MAG30_CURVE.width+.5);
 assert.ok(well.userData.g36MagwellDepth>=G36_MAG30_DEPTH+.3);
 assert.ok(pts.some(p=>approx(p.x,2.65)&&approx(p.y,-3.28)));
 assert.ok(pts.some(p=>approx(p.x,-1.45)&&approx(p.y,-3.28)));
 assert.ok(box(well).intersectsBox(box(mag)));
 assert.equal(F.feedVisualId,'g36-polymer-556');
 assert.equal(F.parts.magazine,'g36-mag30');
 assert.equal(F.magazineMouthX,.45);
 clearWeaponSilhouette(g);m.dispose();
});

test('R2 charging handle is top-center forward under carry-handle, NOT fake side port',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const charge=one(g,'g36ChargingHandle'),receiver=one(g,'g36ReceiverUpper');
 assert.equal(all(g,'g36ChargingHandle').length,1);
 assert.ok(approx(charge.position.x,2.25));
 assert.ok(approx(charge.position.y,1.63));
 assert.ok(approx(charge.position.z,0));
 assert.ok(charge.position.x>1.72,'separate from one-sided ejection port');
 assert.ok(box(charge).intersectsBox(box(receiver)));
 assert.ok(box(charge).max.y<1.92,'stays below carry-handle opening');
 assert.equal(charge.userData.g36ChargePosition,'r2-front-top-under-handle');
 clearWeaponSilhouette(g);m.dispose();
});

test('R2 shares the actual HK selector pictograms: white safe + muted red, two faces ONE mesh',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const mark=one(g,'g36SelectorMarkings');
 assert.ok(mark);
 assert.equal(all(g,'g36SelectorMarkings').length,1);
 assert.equal(mark.userData.g36SelectorMarkCount,2);
 assert.equal(mark.userData.surfaceDetailClass!==undefined,true);
 assert.ok(mark.geometry.getAttribute('position').count===12,'exactly four triangles');
 assert.equal(mark.castShadow,false);
 assert.equal(mark.material.transparent,true);
 assert.ok(mark.material.map?.image?.data,'reuse common HK selector graphic texture');
 const source=mark.material, finish={
  polymer:new THREE.MeshStandardMaterial(),steel:new THREE.MeshStandardMaterial(),
  magazine:new THREE.MeshStandardMaterial(),buttpad:new THREE.MeshStandardMaterial(),
  optic:new THREE.MeshStandardMaterial(),muzzle:new THREE.MeshStandardMaterial()
 };
 applyG36FactoryMaterials(g,finish);
 assert.strictEqual(mark.material,source,'do not overwrite cached pictogram with polymer');
 assert.equal(all(g,'g36SelectorHub').length,2);
 assert.equal(all(g,'g36SelectorLever').length,2);
 clearWeaponSilhouette(g);m.dispose();
 for(const f of Object.values(finish))f.dispose();
});

test('R2 muzzle is genuinely longer/thicker using the same sole end mesh',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const muzzle=one(g,'g36FactoryMuzzle'),barrel=one(g,'g36Barrel');
 const b=box(muzzle),c=box(barrel),span=(x,k)=>x.max[k]-x.min[k];
 assert.equal(all(g,'g36FactoryMuzzle').length,1);
 assert.ok(approx(span(b,'x'),1.60));
 assert.ok(approx(span(b,'y'),1.52));
 assert.ok(approx(span(b,'z'),1.52));
 assert.ok(span(b,'y')>span(c,'y')+.3);
 assert.ok(b.intersectsBox(c),'muzzle slides over existing barrel');
 assert.ok(approx(b.max.x,A.muzzleX));
 assert.equal(tris(muzzle),12);
 clearWeaponSilhouette(g);m.dispose();
});

test('R2 scope up another 0.20 and real sight centers follow both oculars',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 assert.ok(approx(G36_R1_OPTIC_LIFT_Y,.42));
 assert.ok(approx(G36_R2_OPTIC_LIFT_Y,.62));
 assert.ok(approx(A.opticTopY,5.65));
 assert.ok(approx(F.lowerSightY,4.19));
 assert.ok(approx(F.upperSightY,5.16));
 assert.ok(approx(box(one(g,'g36OpticFace')).getCenter(new THREE.Vector3()).y,F.lowerSightY));
 assert.ok(approx(box(one(g,'g36UpperReflexWindow')).getCenter(new THREE.Vector3()).y,F.upperSightY));
 assert.ok(box(one(g,'g36LowerOptic')).intersectsBox(box(one(g,'g36HandleOpening'))));
 assert.equal(tris(one(g,'g36LowerOptic')),20);
 assert.equal(one(g,'g36LowerOpticBarrel').geometry.parameters.radialSegments,6);
 clearWeaponSilhouette(g);m.dispose();
});

test('R2 polygon economy: one ONLY new mesh for colored pictograms, no redundant bevel loops',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 assert.equal(g.children.length,23);
 assert.ok(sceneTris(g)<=650,'reduce total geometry while retaining clear silhouette');
 assert.equal(tris(one(g,'g36LongHandguard')),20);
 assert.ok(tris(one(g,'g36ReceiverUpper'))<=20);
 assert.ok(tris(one(g,'g36ReceiverLower'))<=30);
 assert.equal(tris(one(g,'g36FactoryMuzzle')),12);
 assert.equal(tris(one(g,'g36SelectorMarkings')),4);
 assert.equal(all(g,'g36ChargingHandle').length,1);
 const live=new THREE.Group();
 addG36Family(live,{family:'g36',parts:F.parts});
 assert.equal(live.children.length,23,'actual Arsenal path must use the economical R2 mesh set');
 assert.equal(one(live,'g36MagwellArtVersion'),undefined);
 assert.ok(one(live,'g36SelectorMarkings').material.map);
 clearWeaponSilhouette(g);clearWeaponSilhouette(live);m.dispose();
});
