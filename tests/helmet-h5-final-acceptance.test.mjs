import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';
import {createAchMichFieldNetGeometry} from '../src/operator-helmet-field-net.ts';
import {resolveHelmetField,readHelmetField} from '../src/operator-helmet-field-policy.ts';

test('H5.6: bare-shell net uses fitted shell geometry without a cover',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const bare=createAchMichFieldNetGeometry(shell,false);
  const cover=createAchMichFieldNetGeometry(shell,true);
  assert.notEqual(bare,cover);
  assert.equal(bare.userData.h5NetSurface,'shell');
  assert.equal(cover.userData.h5NetSurface,'cover');
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const mesh=kit.modules.net.getObjectByName('ach-mich-h9-shell-wrapped-diamond-net');
  assert.ok(mesh instanceof THREE.Mesh);
  updateHelmetFieldLayers(kit,{concealment:'net'},0x83765e,false);
  assert.equal(mesh.geometry,bare);
  assert.equal(kit.modules.net.visible,true);
  updateHelmetFieldLayers(kit,{concealment:'net'},0x83765e,true);
  assert.equal(mesh.geometry,cover);
  assert.equal(kit.modules.net.visible,true);
 }
});
test('H5.6: cover toggles preserve faction and saved helmet field preferences',()=>{
 const raw=readHelmetField({concealment:'scrim',rails:true,
  camera:true,battery:true,light:true,lightSide:'left'});
 const bare=resolveHelmetField('ach',raw,{covered:false});
 const dressed=resolveHelmetField('ach',raw,{covered:true});
 assert.equal(bare.concealment,'none');
 assert.equal(dressed.concealment,'scrim');
 assert.equal(raw.concealment,'scrim');
 assert.equal(bare.camera,true);
 assert.equal(dressed.camera,true);
});
