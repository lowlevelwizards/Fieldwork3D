import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';
test('H6.0 rails shift rearward and slots stand vertically',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  for(const side of kit.modules.rails.children){
   assert.equal(side.userData.h60SlotsVertical,true);
   assert.equal(side.userData.h60RailsRearward,true);
   assert.equal(side.userData.h9ArcSlots,6);
   assert.equal(side.userData.h9ArcScrews,2);
  }
  assert.equal(kit.modules.velcro.userData.h9ConformingPanels,4);
 }
});
