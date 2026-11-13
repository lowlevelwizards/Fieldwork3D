import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';
import {createAchMichSurfaceBandGeometry} from '../src/operator-helmet-field-fit.ts';
test('H6.7 band follows near surface and cord keeps five clear anchors',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  for(const covered of [true,false]){
   const band=createAchMichSurfaceBandGeometry(shell,covered);
   assert.ok(band.userData.h58EdgeClearance<.05);
   assert.ok(band.userData.h58CornerClearance<.12);
  }
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  assert.equal(kit.modules.bungees.userData.h67LowClearanceRoute,true);
  for(const route of kit.modules.bungees.userData.h9BungeeRoutes){
   assert.equal(route.path.length,5);
   assert.ok(route.path.every(point=>point.every(Number.isFinite)));
  }
 }
});
