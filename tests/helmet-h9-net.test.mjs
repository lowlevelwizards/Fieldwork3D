import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAchMichFieldNetGeometry}
 from '../src/operator-helmet-field-net.ts';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';
import {HELMET_MOUNT_PROFILES}
 from '../src/operator-helmet-attachment-frames.ts';

test('H9.3: six diagonals wrap the real ACH/MICH crown and descend under the band',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const geo=createAchMichFieldNetGeometry(shell);
  assert.equal(geo.userData.h9NetCordCount,6);
  assert.equal(geo.userData.h9NetPattern,'sparse-diamond');
  assert.equal(geo.userData.h9NetWrapped,true);
  assert.equal(geo.userData.h9NetUnderBand,true);
  const paths=geo.userData.h9NetRoutes;
  assert.equal(paths.length,6);
  assert.equal(geo.getAttribute('position').count,6*14*6);
  assert.ok(geo.boundingBox.max.y-geo.boundingBox.min.y>1.3);
  assert.ok(geo.boundingBox.max.x-geo.boundingBox.min.x>6);
  assert.ok(geo.boundingBox.max.z-geo.boundingBox.min.z>6);
  assert.equal(paths.filter(p=>p.slope<0).length,3);
  assert.equal(paths.filter(p=>p.slope>0).length,3);
  for(const route of paths){
   const [a,b]=route.endpoints;
   assert.ok(Math.abs(a.x-b.x)>1.2,'net should cross crown diagonally');
   assert.ok(Math.abs(a.z-b.z)>1.2,'net should not be parallel roof bars');
   assert.equal(route.crown.length,9);
   assert.ok(route.crown.every(p=>p[1]>HELMET_MOUNT_PROFILES[shell].top-.25));
   assert.ok(route.ties.every(y=>
    Math.abs(y-(HELMET_MOUNT_PROFILES[shell].top-2.39))<1.3),
    'net ties belong at retaining band');
  }
  const p=geo.getAttribute('position');
  for(let i=0;i<p.count;i++)
   assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));
  geo.dispose();
 }
});

test('H9.3: net is one static cosmetic geometry, PASGT net stays independent',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  assert.equal(kit.modules.net.userData.h9NetCordCount,6);
  assert.equal(kit.modules.net.children.length,1);
  assert.equal(kit.modules.net.children[0].castShadow,false);
  updateHelmetFieldLayers(kit,{concealment:'net'},0x566149,true);
  assert.equal(kit.modules.net.visible,true);
  updateHelmetFieldLayers(kit,{concealment:'none'},0x566149,true);
  assert.equal(kit.modules.net.visible,false);
 }
 const pasgt=createHelmetFieldLayers(new THREE.Group(),'pasgt');
 assert.equal(pasgt.modules.net.children.length,0);
});
