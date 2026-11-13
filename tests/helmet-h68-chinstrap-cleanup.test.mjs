import test from 'node:test';
import assert from 'node:assert/strict';
import {createAchMichRetentionGeometry,achMichRetentionPaths}
 from '../src/operator-ach-mich-details.ts';
import * as THREE from 'three';
import {createHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';
test('H6.8 fastened four point retention uses a quiet PASGT-scale cup',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const paths=achMichRetentionPaths(shell);
  assert.equal(paths.length,6);
  assert.ok(paths[2][1][1]>-.3);
  const geo=createAchMichRetentionGeometry(shell);
  assert.ok(geo.getAttribute('position').count>=40);
  assert.ok(geo.getAttribute('position').count<55);
  assert.ok(geo.boundingBox.min.z>-4.85);
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const released=kit.modules.unfastened;
  assert.ok(new THREE.Box3().setFromObject(released).min.y < -1);
  assert.ok(!released.getObjectByName('connected-chin-cup'));
 }
});
