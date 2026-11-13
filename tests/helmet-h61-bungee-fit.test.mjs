import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';
test('H6.1 NVG bungees use shell-aware routes and no cover-only chord',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const g=kit.modules.bungees;
  assert.equal(g.userData.h61CoverAwareTethers,true);
  assert.ok(g.getObjectByName('bungee-cover-route'));
  assert.ok(g.getObjectByName('bungee-bare-route'));
  updateHelmetFieldLayers(kit,{rails:true,shroud:true,bungees:true},0x66775f,false);
  assert.equal(g.getObjectByName('bungee-cover-route').visible,false);
  assert.equal(g.getObjectByName('bungee-bare-route').visible,true);
  updateHelmetFieldLayers(kit,{rails:true,shroud:true,bungees:true},0x66775f,true);
  assert.equal(g.getObjectByName('bungee-cover-route').visible,true);
  assert.equal(g.getObjectByName('bungee-bare-route').visible,false);
 }
});
