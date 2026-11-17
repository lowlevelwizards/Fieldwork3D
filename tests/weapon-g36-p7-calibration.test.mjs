/** P7: experiment candidates on the actual live G36 geometry source.
 * Keep visual alternatives out of saves, body slots and user presets.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout,G36_OPTIC_REVIEW_FORMS}
 from '../src/weapons/geometry/g36-silhouettes.ts';
import {G36_MAG30_CURVE_P6,G36_MAG30_CURVE_CANDIDATE,
 G36_MAG30_OUTLINE,G36_MAG30_OUTLINE_CANDIDATE}
 from '../src/weapons/geometry/g36-magazine-profiles.ts';
import {G36_B_ART as A} from '../src/weapons/geometry/g36-art-layout.ts';
import {arMagazineSample} from '../src/weapons/geometry/ar-magazine-profiles.ts';
import {G36_E0_FACTORY} from '../src/weapons/geometry/g36-family-contract.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
const find=(g,k)=>g.children.find(x=>x.userData[k]);
const box=o=>new THREE.Box3().setFromObject(o);
const tris=g=>g.children.reduce((n,o)=>n+(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3,0);
const close=(a,b)=>Math.abs(a-b)<.02;

test('O2 factory selection: new volumetric dual optic, P6/P7 remain explicit historical art references',()=>{
 const m=new THREE.MeshBasicMaterial({side:THREE.FrontSide});
 const selected=buildG36OriginalBlockout(m);
 const p6=buildG36OriginalBlockout(m,{optic:'p6',magazine:'p6'});
 const rear=buildG36OriginalBlockout(m,{optic:'rear-integrated',magazine:'p6'});
 assert.deepEqual(G36_OPTIC_REVIEW_FORMS.p6.lower,[-3.37,3.35,0,4.95,1.30,1.96]);
 assert.equal(find(selected,'g36UpperReflex').userData.g36OpticArtVersion,'o2-simplified-125-125-55');
 assert.ok(!box(find(selected,'g36UpperReflex')).equals(box(find(rear,'g36UpperReflex'))));
 assert.ok(!box(find(selected,'g36UpperReflex')).equals(box(find(p6,'g36UpperReflex'))));
 assert.ok(box(find(selected,'g36Magazine')).equals(box(find(p6,'g36Magazine'))),
  'unapproved magazine sweep is NOT a silent production change');
 assert.equal(find(selected,'g36HandleOpening').geometry.parameters.shapes.holes.length,1);
 assert.equal(find(selected,'g36MasterStock').geometry.parameters.shapes.holes.length,2);
 assert.equal(G36_E0_FACTORY.mountingPolicy,'no-rail-or-duplicate-sights');
 clearWeaponSilhouette(selected);clearWeaponSilhouette(p6);
 clearWeaponSilhouette(rear);m.dispose();
});
test('P7 isolated optic alternatives hold roof, sight datums, handle span and mesh count',()=>{
 const m=new THREE.MeshBasicMaterial(),p6=buildG36OriginalBlockout(m,{optic:'p6',magazine:'p6'});
 for(const variant of ['lower-emphasis','rear-integrated']){
  const alt=buildG36OriginalBlockout(m,{optic:variant});
  assert.equal(alt.children.length,p6.children.length);
  assert.equal(tris(alt),tris(p6));
  assert.ok(close(box(alt).max.y,A.opticTopY));
  assert.ok(box(find(alt,'g36HandleOpening')).equals(box(find(p6,'g36HandleOpening'))));
  assert.ok(box(find(alt,'g36MasterStock')).equals(box(find(p6,'g36MasterStock'))));
  assert.ok(box(find(alt,'g36LongHandguard')).equals(box(find(p6,'g36LongHandguard'))));
  assert.ok(box(find(alt,'g36Magazine')).equals(box(find(p6,'g36Magazine'))));
  const lo=box(find(alt,'g36LowerOptic')),up=box(find(alt,'g36UpperReflex'));
  assert.ok(lo.intersectsBox(up),'not two floating optic accessories');
  if(variant==='lower-emphasis')
   assert.ok(lo.min.y<box(find(p6,'g36LowerOptic')).min.y-.16);
  else{
   assert.ok(up.max.x<box(find(p6,'g36UpperReflex')).max.x-.45);
   assert.ok(lo.equals(box(find(p6,'g36LowerOptic'))),'isolate top reflex placement');
  }
  clearWeaponSilhouette(alt);
 }
 clearWeaponSilhouette(p6);m.dispose();
});
test('P7 magazine alternative changes curvature ONLY, without feed or length migrations',()=>{
 const base=G36_MAG30_CURVE_P6,c=G36_MAG30_CURVE_CANDIDATE;
 for(const k of ['style','topX','topY','width','depth','length','power'])
  assert.equal(c[k],base[k],k);
 assert.ok(c.sweep>base.sweep+.3);
 assert.deepEqual(G36_MAG30_OUTLINE_CANDIDATE.slice(0,1),G36_MAG30_OUTLINE.slice(0,1),
  'mouth front upper contact must not drift');
 assert.deepEqual(G36_MAG30_OUTLINE_CANDIDATE.slice(-1),G36_MAG30_OUTLINE.slice(-1),
  'mouth rear upper contact must not drift');
 const m=new THREE.MeshBasicMaterial();
 const p6=buildG36OriginalBlockout(m),alt=buildG36OriginalBlockout(m,{magazine:'curve'});
 assert.equal(alt.children.length,p6.children.length);
 assert.equal(tris(alt),tris(p6));
 assert.ok(box(find(alt,'g36Magazine')).max.x>box(find(p6,'g36Magazine')).max.x+.25);
 // Sweep changes face normals and can change the outer tip corner,
 // even though the same centerline end and nominal magazine length remain.
 assert.equal(arMagazineSample(c,1).y,arMagazineSample(base,1).y);
 for(const k of ['g36MasterStock','g36HandleOpening','g36LongHandguard','g36Grip'])
  assert.ok(box(find(alt,k)).equals(box(find(p6,k))));
 assert.equal(G36_E0_FACTORY.feedVisualId,'g36-polymer-556');
 assert.equal(G36_E0_FACTORY.magazineMouthX,.45);
 clearWeaponSilhouette(p6);clearWeaponSilhouette(alt);m.dispose();
});
