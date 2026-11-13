import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';
import {createAchMichFieldNetGeometry} from '../src/operator-helmet-field-net.ts';

test('H10.1: foliage slits use PASGT-style matte buttonhole without luminous outline',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const layers=createHelmetFieldLayers(new THREE.Group(),shell);
  const marks=[];
  layers.modules.loops.traverse(o=>{if(o instanceof THREE.Mesh)marks.push(o)});
  assert.ok(marks.length>=1);
  for(const m of marks){
   const material=m.material;
   assert.ok(material.isMeshStandardMaterial,'slit should be lit textile');
   assert.equal(material.emissive.getHex(),0);
   assert.equal(material.roughness,1);
  }
  assert.equal(layers.modules.scrim.userData.h9FoldedStrips,9);
 }
});
test('H10.1: the six net cords are readable and tuck under physical band',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const geometry=createAchMichFieldNetGeometry(shell);
  assert.equal(geometry.userData.h9NetCordCount,6);
  assert.ok(geometry.userData.h10NetCordWidth>=.28);
  assert.equal(geometry.userData.h9NetUnderBand,true);
  assert.ok(Number.isFinite(geometry.userData.h10BandTieY));
  geometry.dispose();
 }
});
