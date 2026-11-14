import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';
test('H6.2 stowed goggles use clear continuous perimeter ribbons in bare and cover states',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  for(const where of ['front','rear']){
   const parent=kit.modules['goggles-'+where];
   const assembly=parent.children.find(c=>c.userData.h9HelmetGoggles);
   assert.equal(assembly.userData.h12FullPerimeter,true);
   for(const name of ['continuous-helmet-goggle-strap','bare-shell-goggle-strap']){
    const strap=parent.getObjectByName(name);
    assert.ok(strap instanceof THREE.Mesh);
    assert.equal(strap.geometry.userData.h12NoChordThroughShell,true);
    assert.equal(strap.geometry.userData.h12PerimeterSegments,16);
    assert.equal(strap.geometry.getAttribute('position').count,96);
   }
  }
 }
});
