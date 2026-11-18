/** G36 R3 — art-only, reference-grounded final silhouette/identity contract. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout,applyG36FactoryMaterials}
 from '../src/weapons/geometry/g36-silhouettes.ts';
import {addG36Family} from '../src/weapons/geometry/g36-family-silhouettes.ts';
import {G36_E0_FACTORY as F} from '../src/weapons/geometry/g36-family-contract.ts';
import {G36_MAG30_CURVE,G36_MAG30_DEPTH}
 from '../src/weapons/geometry/g36-magazine-profiles.ts';
import {applyG36PixelDetails,g36PixelAtlas}
 from '../src/weapons/geometry/g36-pixel-details.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const one=(g,k)=>g.children.find(m=>m.userData[k]);
const of=(g,k)=>g.children.filter(m=>m.userData[k]);
const near=(a,b,t=.015)=>Math.abs(a-b)<t;
const tris=m=>(m.geometry.index?.count??m.geometry.getAttribute('position').count)/3;
const total=g=>g.children.reduce((n,m)=>n+tris(m),0);
const pts=m=>m.geometry.parameters.shapes.getPoints().slice(0,-1);

test('R3 5.56 magwell: rear 90°, sloping underside, sloping front, one eight-point shell',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const well=one(g,'g36ReceiverLower'),shape=pts(well);
 assert.equal(shape.length,8,'one purposeful eight-corner contour');
 assert.equal(well.userData.g36MagwellArtVersion,'r3-556-vertical-rear');
 const rear=shape.filter(p=>near(p.x,-1.70));
 assert.equal(rear.length,2,'rear must have exactly two x-aligned endpoints');
 assert.ok(rear.some(p=>near(p.y,-2.18)));
 assert.ok(rear.some(p=>near(p.y,-3.49)));
 const front=shape.find(p=>near(p.x,2.72)&&near(p.y,-3.13));
 const bottom=shape.find(p=>near(p.x,-1.70)&&near(p.y,-3.49));
 assert.ok(front&&bottom&&front.y>bottom.y,'bottom slopes down to rear');
 assert.ok(shape.some(p=>near(p.x,4.05)&&near(p.y,-1.28)),
  'front descends diagonally from upper receiver');
 assert.ok(well.userData.g36MagwellMouthWidth>=G36_MAG30_CURVE.width+.5);
 assert.ok(well.userData.g36MagwellDepth>=G36_MAG30_DEPTH+.3);
 assert.equal(well.userData.g36MagwellRearX,-1.70);
 assert.equal(F.feedVisualId,'g36-polymer-556');
 assert.equal(F.parts.magazine,'g36-mag30');
 assert.equal(F.magazineMouthX,.45);
 assert.ok(new THREE.Box3().setFromObject(well).intersectsBox(
  new THREE.Box3().setFromObject(one(g,'g36Magazine'))));
 assert.equal(tris(well),28,'no new funnel collar or interior geometry');
 clearWeaponSilhouette(g);m.dispose();
});

test('R3 switches to real HK S/E/F, uses one batched mesh, restores control position',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const ink=one(g,'g36SelectorMarkings');
 assert.equal(ink.userData.surfaceDetailKind,'hk-selector');
 assert.equal(ink.userData.g36SelectorArtVersion,'r3-sef-rear-low');
 assert.equal(ink.userData.g36SelectorMarkCount,2);
 assert.equal(tris(ink),4,'2 quads with just 4 triangles');
 assert.equal(ink.castShadow,false);
 assert.equal(ink.material.transparent,true);
 for(const hub of of(g,'g36SelectorHub')){
  assert.ok(near(hub.position.x,-5.20));
  assert.ok(near(hub.position.y,-1.96));
  assert.equal(hub.geometry.parameters.radialSegments,6);
 }
 for(const lever of of(g,'g36SelectorLever')){
  assert.ok(lever.position.x<-4.5&&lever.position.y<-1.75);
 }
 assert.equal(of(g,'g36SelectorHub').length,2);
 assert.equal(of(g,'g36SelectorLever').length,2);
 // From HK's shared actual SEF atlas; S is pale, E/F muted red.
 const data=ink.material.map.image.data;
 let safe=0,fire=0;
 for(let i=0;i<data.length;i+=4){
  if(data[i]===223&&data[i+1]===226&&data[i+2]===209&&data[i+3])safe++;
  if(data[i]===191&&data[i+1]===65&&data[i+2]===56&&data[i+3])fire++;
 }
 assert.ok(safe>=7&&fire>=14,'actual white S and red E/F letter pixels exist');
 const pooled=ink.material;
 const f=Object.fromEntries(['polymer','steel','magazine','buttpad','optic','muzzle']
  .map(k=>[k,new THREE.MeshStandardMaterial()]));
 applyG36FactoryMaterials(g,f);
 assert.strictEqual(ink.material,pooled,'SEF colors survive live material assignment');
 for(const mat of Object.values(f))mat.dispose();
 clearWeaponSilhouette(g);m.dispose();
});

test('R3 flash hider: one eight-corner faceted collar/body, 28 triangles, two atlas cutouts',()=>{
 const m=new THREE.MeshStandardMaterial(),g=buildG36OriginalBlockout(m);
 const device=one(g,'g36FactoryMuzzle'),barrel=one(g,'g36Barrel');
 assert.equal(of(g,'g36FactoryMuzzle').length,1);
 assert.equal(device.userData.g36MuzzleArtVersion,'r3-faceted-flash-hider');
 assert.equal(device.geometry.type,'ExtrudeGeometry');
 assert.equal(pts(device).length,8);
 assert.equal(tris(device),28);
 assert.equal(tris(barrel),12);
 const b=new THREE.Box3().setFromObject(device);
 assert.ok(near(b.max.x,F.muzzleX)&&near(b.min.x,17.85));
 assert.ok(near(b.max.y,.77)&&near(b.min.y,-.77));
 assert.ok(near(b.max.z,.71)&&near(b.min.z,-.71));
 assert.ok(new THREE.Box3().setFromObject(barrel).intersectsBox(b));
 const shells=g.children.length,count=total(g);
 applyG36PixelDetails(g);
 assert.equal(g.children.length,shells,'no decals, mesh proliferation or draw additions');
 assert.equal(total(g),count,'no new triangles for two side slots');
 assert.strictEqual(device.material.map,g36PixelAtlas(),'reuse exact G36 atlas');
 const uv=device.geometry.getAttribute('uv');
 assert.equal(uv.count,device.geometry.getAttribute('position').count);
 assert.ok(Array.from({length:uv.count},(_,i)=>uv.getX(i))
  .some(u=>u<.25),'right-side flash slots sample guard atlas tile');
 assert.strictEqual(device.material.map,g36PixelAtlas());
 const mapped=device.material;
 applyG36PixelDetails(g);
 assert.strictEqual(device.material,mapped,'repeat use is cached');
 clearWeaponSilhouette(g);m.dispose();
});

test('R3 production G36 remains 23 meshes, at most 470 triangles, with unchanged mount contracts',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 assert.equal(g.children.length,23);
 assert.ok(total(g)<=470,`R3 budget exceeded: ${total(g)}`);
 assert.equal(tris(one(g,'g36LongHandguard')),20);
 assert.equal(tris(one(g,'g36FactoryMuzzle')),28);
 const live=new THREE.Group();
 addG36Family(live,{family:'g36',parts:F.parts});
 assert.equal(live.children.length,23);
 assert.ok(total(live)<=470);
 assert.equal(one(live,'g36SelectorMarkings').userData.surfaceDetailKind,'hk-selector');
 assert.equal(one(live,'g36ReceiverLower').userData.g36MagwellArtVersion,'r3-556-vertical-rear');
 assert.equal(F.lowerSightY,4.19);
 assert.equal(F.upperSightY,5.16);
 clearWeaponSilhouette(g);clearWeaponSilhouette(live);m.dispose();
});
