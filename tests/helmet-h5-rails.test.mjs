import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';

test('H5.2: continuous ARC rails descend behind ear instead of rising',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  for(const side of kit.modules.rails.children){
   assert.equal(side.userData.h5RearContour,'descending-ear-clearance');
   const pts=side.userData.h9ArcStationPositions;
   assert.ok(pts.at(-1)[1]<pts[0][1]-.5);
   assert.ok(pts.every(v=>v.every(Number.isFinite)));
  }
  assert.equal(kit.modules.bungees.userData.h5CloserSurfaceFit,true);
  const routes=kit.modules.bungees.userData.h9BungeeRoutes;
  assert.equal(routes.length,2);
  assert.ok(routes.every(r=>r.segmentCount===30));
 }
});
