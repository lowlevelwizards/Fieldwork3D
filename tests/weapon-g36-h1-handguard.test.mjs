/** H2.1 live factory: exact isolated sculpt at original HK G36 mounting. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout}
 from '../src/weapons/geometry/g36-silhouettes.ts';
import {addG36Family}
 from '../src/weapons/geometry/g36-family-silhouettes.ts';
import {G36_E0_FACTORY}
 from '../src/weapons/geometry/g36-family-contract.ts';
import {G36_H2_STATIONS,G36_H2_VENT_CENTERS,G36_H2_VENT_SIZE,
 h21FactoryX,h21FactoryY}
 from '../src/weapons/geometry/g36-h2-handguard-study.ts';
import {G36_LONG_FOREND_RINGS,addG36LongHandguard}
 from '../src/weapons/geometry/g36-handguard-profiles.ts';
import {G36_DARK_POLYMER,G36_LENS_BLACK}
 from '../src/weapons/geometry/weapon-visual-palette.ts';
import {applyG36PixelDetails,g36PixelAtlas,g36PixelAtlasLayout}
 from '../src/weapons/geometry/g36-pixel-details.ts';
import {G36_B_ART as A} from '../src/weapons/geometry/g36-art-layout.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
const one=(g,k)=>g.children.find(m=>m.userData[k]);
const box=(m)=>new THREE.Box3().setFromObject(m);
const near=(a,b,t=.018)=>Math.abs(a-b)<t;
const triangles=g=>g.children.reduce((n,m)=>
 n+(m.geometry.index?.count??m.geometry.getAttribute('position').count)/3,0);
const pixel=(col,x,y)=>{
 const px=Math.floor((x-3.75)/(13.45-3.75)*96);
 const py=Math.floor((y+2.15)/(1.55+2.15)*96);
 return g36PixelAtlas().image.data[(py*384+col*96+px)*4];
};

test('H2.1 factory replaces H1 with five eight-point angled stations and front opening',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const guard=one(g,'g36LongHandguard');
 assert.equal(guard.userData.g36HandguardArtVersion,'h2.1-angled-four-vents');
 assert.equal(guard.userData.g36HandguardSectionSides,8);
 assert.equal(guard.userData.g36HandguardStations,5);
 assert.equal(G36_H2_STATIONS.length,5);
 assert.equal(guard.geometry.getAttribute('position').count,258);
 assert.ok(one(g,'g36H21MouthRecess')&&one(g,'g36H21MountingLug'));
 assert.equal(g.children.filter(x=>x.userData.g36H21MountingLug).length,1);
 assert.equal(g.children.filter(x=>x.userData.g36H21MouthRecess).length,1);
 assert.equal(g.children.length,24,'only two additional major silhouette parts');
 assert.ok(triangles(g)<=760,'no micro-geometry explosion');
 assert.ok(box(guard).intersectsBox(box(one(g,'g36ReceiverUpper'))));
 assert.ok(box(guard).intersectsBox(box(one(g,'g36Barrel'))));
 assert.ok(near(box(g).max.x,A.muzzleX));
 assert.ok(g.children.every(x=>x.material===m),
  'factory review builder keeps supplied common material before finishing');
 clearWeaponSilhouette(g);m.dispose();
});

test('H2.1 sculpt shape preserves original mount and angled ends from isolated source',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const guard=one(g,'g36LongHandguard'),a=guard.geometry.getAttribute('position');
 const find=(x,y,z)=>Array.from({length:a.count},(_,i)=>i).some(i=>
  near(a.getX(i),x,.002)&&near(a.getY(i),y,.002)&&
  near(a.getZ(i),z,.002));
 const rear=G36_H2_STATIONS[0],mid=G36_H2_STATIONS[1],
  full=G36_H2_STATIONS[2],nose=G36_H2_STATIONS[4];
 assert.ok(find(h21FactoryX(rear.x+(rear.roofShift??0)),
  h21FactoryY(rear.top),-rear.half*.76));
 assert.ok(find(h21FactoryX(rear.x+(rear.floorShift??0)),
  h21FactoryY(rear.bottom),rear.half*.79));
 assert.ok(find(h21FactoryX(nose.x+(nose.roofShift??0)),
  h21FactoryY(nose.top),-nose.half*.76));
 assert.ok(find(h21FactoryX(nose.x+(nose.floorShift??0)),
  h21FactoryY(nose.bottom),nose.half*.79));
 assert.equal(mid.top,full.top,'long roof is parallel');
 assert.equal(mid.bottom,full.bottom,'long floor is parallel');
 assert.equal(mid.half,full.half,'middle stays maximum-width and broad');
 assert.ok(full.x-mid.x>=6.5);
 const width=box(guard).getSize(new THREE.Vector3()).z;
 assert.ok(width>3&&width<3.1,'more substantial than H1');
 assert.ok(near(h21FactoryX(0),3.75));
 assert.ok(near(h21FactoryX(10),13.45));
 assert.equal(G36_LONG_FOREND_RINGS.length,3,'original H1 comparator remains available');
 const comparison=new THREE.Group();
 const old=addG36LongHandguard(comparison,'h1-archive',0,m);
 assert.equal(old.geometry.getAttribute('position').count,96);
 clearWeaponSilhouette(comparison);clearWeaponSilhouette(g);m.dispose();
});

test('H2.1 uses one cached atlas for exactly four larger, higher vents on each side',()=>{
 const layout=g36PixelAtlasLayout();
 assert.equal(layout.width,384);assert.equal(layout.height,192);
 assert.equal(layout.ventsPerSide,4);
 assert.equal(layout.rightReceiverEjectionOnly,true);
 assert.strictEqual(g36PixelAtlas(),g36PixelAtlas(),'no per-render texture churn');
 assert.equal(G36_H2_VENT_CENTERS.length,4);
 assert.equal(G36_H2_VENT_SIZE.length,1.32);
 assert.equal(G36_H2_VENT_SIZE.height,.4);
 for(const side of [0,1]){
  for(const localX of G36_H2_VENT_CENTERS){
   const x=h21FactoryX(localX),y=h21FactoryY(G36_H2_VENT_SIZE.centerY);
   assert.ok(pixel(side,x,y)<110,'prominent H2.1 side vent is present');
   assert.equal(pixel(side,x,y+.37),255,'upper shoulder remains quiet');
   assert.equal(pixel(side,x,y-.37),255,'lower shell remains quiet');
  }
 }
 const m=new THREE.MeshStandardMaterial(),g=buildG36OriginalBlockout(m),
  before=g.children.length;
 applyG36PixelDetails(g);
 assert.equal(g.children.length,before,'vents are NOT extra geometry');
 const guard=one(g,'g36LongHandguard');
 assert.strictEqual(guard.material.map,g36PixelAtlas());
 assert.equal(guard.userData.g36AtlasProjected,true);
 const decorated=guard.material;
 applyG36PixelDetails(g);
 assert.strictEqual(guard.material,decorated,'stable map/material cache');
 clearWeaponSilhouette(g);m.dispose();
});

test('H2.1 live Arsenal adapter uses pooled polymer, dark recessed mouth, and same part ID',()=>{
 const g=new THREE.Group();
 addG36Family(g,{family:'g36',parts:G36_E0_FACTORY.parts});
 assert.equal(g.userData.g36OriginalFactory,true);
 assert.equal(g.userData.g36IntegratedDualOptic,true);
 const guard=one(g,'g36LongHandguard');
 assert.ok(guard.name.includes('family-handguard-'));
 assert.equal(guard.userData.g36HandguardArtVersion,'h2.1-angled-four-vents');
 assert.equal(guard.material.color.getHex(),G36_DARK_POLYMER.color.getHex());
 assert.equal(guard.material.map,g36PixelAtlas());
 assert.strictEqual(one(g,'g36H21MountingLug').material,G36_DARK_POLYMER);
 assert.strictEqual(one(g,'g36H21MouthRecess').material,G36_LENS_BLACK);
 assert.equal(g.children.length,24);
 assert.ok(triangles(g)<=760);
 clearWeaponSilhouette(g);
});
