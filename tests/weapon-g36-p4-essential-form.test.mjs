import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout} from '../src/weapons/geometry/g36-silhouettes.ts';
import {g36PixelAtlas,g36PixelAtlasLayout,applyG36PixelDetails}
 from '../src/weapons/geometry/g36-pixel-details.ts';
import {G36_E0_FACTORY} from '../src/weapons/geometry/g36-family-contract.ts';
import {G36_B_ART as A} from '../src/weapons/geometry/g36-art-layout.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
const one=(g,key)=>g.children.find(x=>x.userData[key]);
const bounds=x=>new THREE.Box3().setFromObject(x);
const ray=(mesh,x,y)=>new THREE.Raycaster(
 new THREE.Vector3(x,y,8),new THREE.Vector3(0,0,-1))
 .intersectObject(mesh,false).length>0;

test('G36 P4: primary stock opening is enlarged, buttpad is not a thick slab',()=>{
 const m=new THREE.MeshBasicMaterial({side:THREE.FrontSide}),g=buildG36OriginalBlockout(m);
 const frame=one(g,'g36MasterStock'),pad=one(g,'g36Buttpad'),
  hinge=one(g,'g36StockHinge');
 assert.equal(frame.geometry.parameters.shapes.holes.length,2);
 assert.equal(ray(frame,-12.5,-1.4),false);
 assert.equal(ray(frame,-13.4,-4.2),false,'open rear heel must not fill in');
 assert.equal(ray(frame,-8.15,-.92),false);
 assert.equal(ray(frame,-14.45,-4.8),true,'keep a visible descending outer heel');
 assert.ok(bounds(pad).max.x-bounds(pad).min.x<.51,
  'P3 buttpad was too deep in profile');
 assert.ok(bounds(pad).max.z-bounds(pad).min.z<2.0);
 assert.ok(bounds(hinge).max.z-bounds(hinge).min.z<2.1);
 assert.ok(Math.abs(bounds(g).min.x-A.stockRearX)<.01);
 clearWeaponSilhouette(g);m.dispose();
});

test('G36 P4: two essential optic housings and no tiny rear eyepiece',()=>{
 const m=new THREE.MeshBasicMaterial({side:THREE.FrontSide}),g=buildG36OriginalBlockout(m);
 const lower=one(g,'g36LowerOptic'),upper=one(g,'g36UpperReflex'),
  face=one(g,'g36OpticFace'),window=one(g,'g36UpperReflexWindow');
 assert.ok(lower&&upper&&face&&window);
 assert.ok(!one(g,'g36LowerEyepiece'));
 assert.ok(bounds(lower).intersectsBox(bounds(one(g,'g36LowerOpticBarrel'))));
 assert.ok(bounds(face).intersectsBox(bounds(one(g,'g36LowerOpticBarrel'))));
 assert.ok(bounds(upper).intersectsBox(bounds(one(g,'g36UpperReflexBarrel'))));
 assert.ok(bounds(window).intersectsBox(bounds(one(g,'g36UpperReflexBarrel'))));
 assert.ok(bounds(window).max.y-bounds(window).min.y>=.48);
 assert.ok(bounds(lower).max.y-bounds(lower).min.y>=1.1);
 assert.ok(bounds(face).max.z-bounds(face).min.z>=.80);
 assert.ok(Math.abs(bounds(g).max.y-A.opticTopY)<.01);
 assert.equal(G36_E0_FACTORY.lowerSightY,3.57);
 clearWeaponSilhouette(g);m.dispose();
});

test('G36 P4: one atlas, large vents, quiet mag and clean lower receiver',()=>{
 const layout=g36PixelAtlasLayout();
 assert.equal(layout.ventsPerSide,4);
 assert.equal(layout.magRibsPerSide,0);
 assert.equal(layout.sideTiles.length,8);
 const image=g36PixelAtlas().image;
 const sample=(col,row,x,y)=>{
  const ix=(row*96+y)*384+col*96+x;
  return image.data[ix*4];
 };
 // Large front vents should remain high contrast while lower receiver stays blank.
 assert.notEqual(sample(0,0,24,60),255);
 assert.equal(sample(0,1,52,62),255);
 // A large magazine panel is restrained, not the prior three nearly black ribs.
 assert.ok(sample(2,1,55,51)>=200);
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const before=g.children.length;
 applyG36PixelDetails(g);
 assert.equal(g.children.length,before,'all marks are on the existing geometry');
 clearWeaponSilhouette(g);m.dispose();
});

test('G36 P4: larger handguard graphic decisions without new vent meshes',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const guard=one(g,'g36LongHandguard');
 const p=guard.geometry.getAttribute('position');
 assert.equal(p.count,258,'H2.1: five eight-corner stations, rear cap and inset mouth');
 assert.equal(g.children.filter(o=>o.userData.g36LongHandguard).length,1);
 assert.ok(bounds(guard).max.y-bounds(guard).min.y>3.20);
 assert.ok(bounds(guard).max.z-bounds(guard).min.z<3.25);
 assert.ok(Math.abs(bounds(g).max.x-A.muzzleX)<1e-4,
  'muzzle datum remains within Float32 vertex precision');
 clearWeaponSilhouette(g);m.dispose();
});
