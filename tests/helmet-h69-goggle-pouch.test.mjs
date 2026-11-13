import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';
test('H6.9 each stowed goggle strap is exactly three broad panels',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  for(const where of ['front','rear']){
   const root=kit.modules['goggles-'+where];
   const assembly=root.children.find(x=>x.userData.h9HelmetGoggles);
   assert.equal(assembly.userData.h9StrapSegments,3);
   for(const fit of ['goggle-retention-covered','goggle-retention-bare']){
    const g=root.getObjectByName(fit);
    const faces=g.children.filter(x=>x instanceof THREE.Mesh&&x.geometry.userData.h69OneBroadPlane);
    assert.equal(faces.length,3);
   }
   const pouch=root.getObjectByName('goggle-fabric-sleeve');
   assert.ok(pouch.userData.h69SoftPouchDepth>.6);
   assert.ok(pouch.getObjectByName('sleeve-padded-top-opening'));
  }
 }
});
