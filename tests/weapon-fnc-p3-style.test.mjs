/** FNC P5 Fieldwork identity: large forms, readable sight openings and stock. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {AR_STANAG_METAL,AR_STANAG_RIB}
 from '../src/weapons/geometry/weapon-visual-palette.ts';

const box=x=>new THREE.Box3().setFromObject(x);
const of=(g,k)=>g.children.filter(x=>x.userData[k]);
const factory=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
test('P10 stock: continuous upper rail and distinct inset FNC bridge plate',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const rails=of(g,'fncStockRail').filter(x=>x.userData.fncStockRail===true);
 const web=of(g,'fncP5StockMiddleBrace')[0];
 assert.equal(rails.length,2);
 assert.equal(of(g,'fncCheekSleeve').length,0);
 assert.equal(of(g,'fncNoCoplanarRail').length,0);
 assert.ok(box(rails[0]).max.x-box(rails[0]).min.x>7.5,
  'the uninterrupted upper steel rail replaces the entire sleeve assembly');
 assert.ok(box(rails[0]).min.y>box(rails[1]).max.y+.20);
 assert.ok(web,'FNC stock requires the intermediate triangular web');
 assert.ok(box(web).min.x<-11&&box(web).max.x>-11);
 assert.ok(box(web).max.y<0&&box(web).min.y>-2.9,
  'web lies between the stock rails without becoming a solid butt');
 assert.ok(Math.abs(box(g).min.x-FNC_P1.stockRearX)<.02);
 clearWeaponSilhouette(g);m.dispose();
});
test('P5 receiver: true three-dimensional tapered roof narrower than lower',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const upper=of(g,'fncP5CrownedReceiver')[0];
 const lower=of(g,'fncAngularLower')[0];
 assert.ok(upper&&lower);
 assert.equal(upper.userData.fncP5RoofHalfWidth,.88);
 assert.equal(upper.userData.fncP5UpperSideHalfWidth,1.39);
 assert.ok(box(upper).max.z<box(lower).max.z-.30,
  'upper side must be narrower than the lower even below its shoulder');
 const pos=upper.geometry.getAttribute('position');
 const nearRoof=[],side=[];
 for(let i=0;i<pos.count;i++){
  const y=pos.getY(i),z=Math.abs(pos.getZ(i));
  if(y>1.38)nearRoof.push(z);
  if(y<-.65)side.push(z);
 }
 assert.ok(nearRoof.length>0&&side.length>0);
 assert.ok(Math.max(...nearRoof)<Math.max(...side)-.35,
  'actual upper cross section must taper toward roof in Z');
 clearWeaponSilhouette(g);m.dispose();
});
test('P5 landmarks: oversized sight openings, longer charging handle and muzzle',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const front=of(g,'fncP5OversizedFrontSight')[0];
 const rear=of(g,'fncP5OversizedRearSight')[0];
 const handle=of(g,'fncP5LargeChargingHandle')[0];
 const muzzle=of(g,'fncP5ChunkyMuzzle')[0];
 assert.ok(front&&rear&&handle&&muzzle);
 assert.equal(of(g,'fncP12FALLikeFrontEar').length,2);
 assert.ok(front.userData.fncP12FALLikeFrontEar,
  'simplified FAL-style twin ears replace sculpted sight');
 assert.equal(rear.geometry.parameters.shapes.holes.length,1);
 assert.ok(box(front).max.y>2.70&&box(front).max.y<2.85,
  'compact FAL-like ears must not remain tall towers');
 assert.ok(box(rear).max.y>2.40);
 assert.ok(box(handle).max.x-box(handle).min.x<1.15,
  'charging handle is short along X, not a stretched receiver-side bar');
 assert.ok(box(handle).max.z>2.58,
  'charging handle extends boldly out along Z');
 assert.ok(box(handle).max.z>box(of(g,'fncP5CrownedReceiver')[0]).max.z+.6);
 assert.ok(box(muzzle).max.y-box(muzzle).min.y>1.20);
 assert.ok(Math.abs(box(g).max.x-FNC_P1.muzzleX)<.02);
 const noFactory=buildFNCStage1Silhouette(m,{},false);
 assert.equal(of(noFactory,'fncMuzzle').length,0);
 assert.ok(Math.abs(box(noFactory).max.x-FNC_P1.muzzleX)<.02);
 clearWeaponSilhouette(noFactory);clearWeaponSilhouette(g);m.dispose();
});
test('Shared AR steel magazine and compact low-poly FNC production asset',()=>{
 const m=new THREE.MeshBasicMaterial();
 const g=buildWeaponSilhouette('rifle',m,m,factory());
 const mag=of(g,'fnc556Magazine')[0],rib=of(g,'fncStampedMagazineRib')[0];
 assert.equal(mag?.material,AR_STANAG_METAL);
 assert.equal(rib?.material,AR_STANAG_RIB);
 assert.equal(of(g,'fncP5StockMiddleBrace').length,1);
 assert.equal(of(g,'fncP5UpperGasBox').length,1);
 const tri=g.children.reduce((n,x)=>n+
  (x.geometry?.index?.count??x.geometry?.getAttribute('position')?.count??0)/3,0);
 assert.ok(g.children.length<=36,'avoid unnecessary decorative attachments');
 assert.ok(tri<1150,'preserve low-poly Fieldwork geometry budget');
 clearWeaponSilhouette(g);m.dispose();
});
