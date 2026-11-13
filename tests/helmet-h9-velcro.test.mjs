import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';
test('H9.6: ACH/MICH cover-facing Velcro and patch are real surface geometry',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const velcro=kit.modules.velcro,patch=kit.modules.patches;
  assert.equal(velcro.userData.h9ConformingPanels,4);
  assert.equal(velcro.userData.h9CornerSamples,32);
  assert.equal(patch.userData.h9ConformingPatch,true);
  assert.equal(patch.userData.h9LeftSideNormal,true);
  assert.ok(velcro.children.some(o=>o instanceof THREE.Mesh));
  assert.ok(patch.children.some(o=>o instanceof THREE.Mesh));
  for(const g of [velcro,patch])
   for(const m of g.children){
    if(!(m instanceof THREE.Mesh))continue;
    const a=m.geometry.getAttribute('position');
    assert.ok(a&&a.count>=6);
    for(let i=0;i<a.count;i++)
     assert.ok(Number.isFinite(a.getX(i)+a.getY(i)+a.getZ(i)));
   }
  updateHelmetFieldLayers(kit,{velcro:true,patches:true},0x5f6852,true);
  assert.equal(velcro.visible,true);assert.equal(patch.visible,true);
  updateHelmetFieldLayers(kit,{velcro:false,patches:false},0x5f6852,true);
  assert.equal(velcro.visible,false);assert.equal(patch.visible,false);
 }
});
test('H9.6: modern cloth fitting not added to historical PASGT baseline',()=>{
 const kit=createHelmetFieldLayers(new THREE.Group(),'pasgt');
 assert.equal(kit.modules.velcro.children.length,0);
 assert.equal(kit.modules.patches.userData.h9ConformingPatch,undefined);
});
