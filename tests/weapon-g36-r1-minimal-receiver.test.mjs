/** R1 screenshot-directed simple G36 receiver, optic, controls and magazine. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout} from '../src/weapons/geometry/g36-silhouettes.ts';
import {addG36Family} from '../src/weapons/geometry/g36-family-silhouettes.ts';
import {G36_E0_FACTORY} from '../src/weapons/geometry/g36-family-contract.ts';
import {G36_B_ART} from '../src/weapons/geometry/g36-art-layout.ts';
import {G36_R1_OPTIC_LIFT_Y} from '../src/weapons/geometry/g36-dual-optic-o2.ts';
import {g36PixelAtlas,applyG36PixelDetails} from '../src/weapons/geometry/g36-pixel-details.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const one=(g,k)=>g.children.find(x=>x.userData[k]);
const all=(g,k)=>g.children.filter(x=>x.userData[k]);
const bb=m=>new THREE.Box3().setFromObject(m);
const near=(a,b,t=.025)=>Math.abs(a-b)<=t;
const triangles=m=>(m.geometry.index?.count??m.geometry.getAttribute('position').count)/3;
const pixel=(col,row,x,y)=>g36PixelAtlas().image.data[((row*96+y)*384+col*96+x)*4];

test('R1 receiver has precisely two bold continuous polymer masses, no new trim',()=>{
 const mat=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(mat);
 const upper=one(g,'g36ReceiverUpper'),lower=one(g,'g36ReceiverLower');
 assert.equal(upper.userData.g36ReceiverArtVersion,'r2-broad-interlocking-upper');
 // THREE Shape.getPoints includes its repeated closing vertex.
 assert.equal(upper.geometry.parameters.shapes.getPoints().length-1,6);
 assert.equal(lower.geometry.parameters.shapes.getPoints().length-1,8);
 assert.ok(triangles(upper)<=20&&triangles(lower)<=30);
 assert.equal(lower.userData.g36OpenTriggerGap,true);
 assert.ok(bb(upper).intersectsBox(bb(lower)));
 assert.ok(bb(upper).intersectsBox(bb(one(g,'g36LongHandguard'))));
 assert.ok(bb(lower).intersectsBox(bb(one(g,'g36Magazine'))));
 assert.equal(g.children.filter(c=>c.name.startsWith('family-handguard-')).length,1);
 assert.equal(g.children.length,23,'one indispensable two-sided HK pictogram batch');
 clearWeaponSilhouette(g);mat.dispose();
});

test('R1 charging tab is at right ejection port x and sits above port, not on roof',()=>{
 const mat=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(mat);
 const tab=one(g,'g36ChargingHandle'),body=one(g,'g36ReceiverUpper');
 assert.equal(all(g,'g36ChargingHandle').length,1);
 assert.ok(near(tab.position.x,2.25,.03));
 assert.ok(tab.position.y>1.49&&tab.position.y<1.85);
 assert.ok(near(tab.position.z,0,.01),'charge tab crosses top center, not port side');
 assert.ok(bb(tab).intersectsBox(bb(body)));
 assert.ok(bb(tab).min.y>0,'charge tab no longer crosses entire receiver');
 assert.ok(pixel(2,0,55,63)<110&&pixel(3,0,55,63)===255,
  'right-side ink port only; no duplicated opposite ejection port');
 clearWeaponSilhouette(g);mat.dispose();
});

test('R1 selectors shift forward and up on BOTH sides without changing shared selector tool',()=>{
 const mat=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(mat);
 const hubs=all(g,'g36SelectorHub'),levers=all(g,'g36SelectorLever');
 assert.equal(hubs.length,2);assert.equal(levers.length,2);
 for(const hub of hubs){
  assert.ok(near(hub.position.x,-3.95,.01));
  assert.ok(near(hub.position.y,-1.14,.01));
  assert.ok(hub.position.x>-5.20&&hub.position.y>-1.96);
  assert.equal(hub.geometry.parameters.radialSegments,8);
 }
 for(const lever of levers)assert.ok(lever.position.x>-4.00&&lever.position.y>-1.25);
 clearWeaponSilhouette(g);mat.dispose();
});

test('R1 both lens planes and aiming contacts rise together, with no new optic meshes',()=>{
 const mat=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(mat);
 assert.equal(G36_R1_OPTIC_LIFT_Y,.42);
 assert.equal(G36_B_ART.opticTopY,5.65);
 assert.equal(G36_E0_FACTORY.lowerSightY,4.19);
 assert.equal(G36_E0_FACTORY.upperSightY,5.16);
 const lower=one(g,'g36LowerOptic'),upper=one(g,'g36UpperReflex');
 assert.ok(near(bb(upper).max.y,5.65,.001));
 assert.ok(bb(lower).intersectsBox(bb(one(g,'g36HandleOpening'))));
 assert.ok(bb(upper).intersectsBox(bb(lower)));
 assert.ok(near(bb(one(g,'g36OpticFace')).getCenter(new THREE.Vector3()).y,4.19,.001));
 assert.ok(near(bb(one(g,'g36UpperReflexWindow')).getCenter(new THREE.Vector3()).y,5.16,.001));
 for(const key of ['g36LowerOptic','g36UpperReflex','g36LowerOpticBarrel',
  'g36UpperReflexBarrel','g36OpticFace','g36UpperReflexWindow'])
  assert.equal(one(g,key).userData.g36OpticVerticalRevision,'r2-raised');
 assert.equal(g.children.length,23);
 clearWeaponSilhouette(g);mat.dispose();
});

test('R1 magazine tile is uniformly unprinted on BOTH faces; reused one pooled finish',()=>{
 const data=g36PixelAtlas().image.data;
 for(const col of [2,3])for(const y of [5,32,50,76,90])
  for(const x of [3,25,55,75,94]){
   const i=((96+y)*384+col*96+x)*4;
   assert.equal(data[i],255,'no rectangular overlays or banding');
  }
 const mat=new THREE.MeshStandardMaterial(),g=buildG36OriginalBlockout(mat);
 const mag=one(g,'g36Magazine');
 applyG36PixelDetails(g);
 assert.strictEqual(mag.material.map,g36PixelAtlas());
 const decorated=mag.material;
 applyG36PixelDetails(g);
 assert.strictEqual(mag.material,decorated,'pooled material not reallocated');
 const live=new THREE.Group();
 addG36Family(live,{family:'g36',parts:G36_E0_FACTORY.parts});
 assert.ok(one(live,'g36Magazine').material.map);
 assert.ok(!one(live,'g36Magazine').material.transparent);
 clearWeaponSilhouette(g);clearWeaponSilhouette(live);mat.dispose();
});
