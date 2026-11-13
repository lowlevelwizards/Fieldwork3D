import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';

test('H10.2: oversized shroud, correctly oriented rail slots and thicker exterior bungee',()=>{
 for(const id of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),id);
  const anchor=kit.modules.shroud.children.find(x=>x.userData.h9ShroudScrews===3);
  assert.ok(anchor);assert.ok(anchor.userData.h10GraphicScale>=1.2);
  assert.ok(anchor.scale.x>1.2);
  const rails=kit.modules.rails;
  assert.equal(rails.children.length,2);
  for(const side of rails.children){
   assert.equal(side.userData.h9ArcSlots,6);
   const bounds=new THREE.Box3().setFromObject(side),size=new THREE.Vector3();
   bounds.getSize(size);
   assert.ok(size.y>1.2,'rail too thin to read');
  }
  assert.ok(kit.modules.bungees.userData.h10BungeeThickness>=.14);
  assert.equal(kit.modules.bungees.userData.h9BungeeHooks,4);
 }
});
test('H10.2: large fitted textile panels, including larger identifier',()=>{
 for(const id of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),id);
  assert.equal(kit.modules.velcro.userData.h10GraphicPanelsEnlarged,true);
  assert.equal(kit.modules.patches.userData.h10GraphicPatchEnlarged,true);
  assert.equal(kit.modules.velcro.userData.h9ConformingPanels,4);
 }
});
