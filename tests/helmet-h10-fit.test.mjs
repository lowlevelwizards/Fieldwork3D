import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAchMichSurfaceBandGeometry}
 from '../src/operator-helmet-field-fit.ts';
import {createAchMichDetails,updateAchMichDetails,
 createAchMichRetentionGeometry} from '../src/operator-ach-mich-details.ts';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';

test('H10.0 closed elastic ring follows fitted ACH/MICH cloth, not a shell chord',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const geo=createAchMichSurfaceBandGeometry(shell);
  assert.equal(geo.userData.h10BandSurfaceFitted,true);
  assert.equal(geo.userData.h10BandClosed,true);
  assert.ok(geo.userData.h10BandStations>=32);
  const pos=geo.getAttribute('position');
  assert.equal(pos.count,geo.userData.h10BandStations*6);
  for(let i=0;i<pos.count;i++)
   assert.ok(Number.isFinite(pos.getX(i)+pos.getY(i)+pos.getZ(i)));
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  assert.equal(kit.modules.band.userData.h10RealCoverRing,true);
  updateHelmetFieldLayers(kit,{band:true},0x63705e,true);
  assert.equal(kit.modules.band.visible,true);
  updateHelmetFieldLayers(kit,{band:false},0x63705e,true);
  assert.equal(kit.modules.band.visible,false);
  geo.dispose();
 }
});

test('H10.0 covered shell remains solid beneath textile, uncovered rim remains separate',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const layers=createAchMichDetails(new THREE.Group(),shell);
  const lip=layers.coveredLiner.getObjectByName('inward-covered-helmet-protective-lip');
  assert.ok(lip instanceof THREE.Mesh);
  assert.equal(layers.coveredLiner.userData.h10SolidUnderCover,true);
  updateAchMichDetails(layers,true,true);
  assert.equal(layers.bare.visible,false);
  assert.equal(layers.coveredLiner.visible,true);
  assert.equal(layers.strap.visible,true);
  updateAchMichDetails(layers,false,true);
  assert.equal(layers.bare.visible,true);
  assert.equal(layers.coveredLiner.visible,false);
  const retention=createAchMichRetentionGeometry(shell);
  assert.equal(retention.userData.integratedChinCup,true);
  assert.ok(retention.getAttribute('position').count>=66);
 }
});
