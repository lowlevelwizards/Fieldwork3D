import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sampleHelmetCover,sampleHelmetShell} from '../src/operator-helmet-surface.ts';
import {ACH_MICH_COVER_OFFSET} from '../src/operator-ach-mich-cover-drape.ts';
import {createAchMichSurfaceBandGeometry} from '../src/operator-helmet-field-fit.ts';
import {createHelmetFieldLayers,updateHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';

test('H5.0: shell sockets sit beneath cloth sockets with stable normals',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const cover=sampleHelmetCover(shell,'back',0,.24,.13);
  const bare=sampleHelmetShell(shell,'back',0,.24,.13);
  assert.ok(cover&&bare);
  assert.ok(Math.abs(cover.position.distanceTo(bare.position)-ACH_MICH_COVER_OFFSET)<.005);
  assert.ok(cover.normal.distanceTo(bare.normal)<1e-5);
 }
});
test('H5.0: band changes fitted geometry without replacing accessory groups',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const covered=createAchMichSurfaceBandGeometry(shell,true);
  const bare=createAchMichSurfaceBandGeometry(shell,false);
  assert.notEqual(covered,bare);
  assert.equal(bare.userData.h5SurfaceMode,'shell');
  assert.equal(covered.userData.h5SurfaceMode,'cover');
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const band=kit.modules.band.getObjectByName('surface-wrapped-elastic-band');
  assert.ok(band instanceof THREE.Mesh);
  updateHelmetFieldLayers(kit,{band:true},0x80735d,false);
  assert.equal(band.geometry,bare);
  updateHelmetFieldLayers(kit,{band:true},0x80735d,true);
  assert.equal(band.geometry,covered);
  assert.equal(kit.modules.band.visible,true);
  const counter=kit.modules.counterweight.children.find(o=>o.name==='helmet-addon-fitted-socket');
  assert.equal(counter?.userData.h5HardMountedToShell,true);
 }
});
