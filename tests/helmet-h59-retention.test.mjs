import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {achMichRetentionPaths,createAchMichRetentionGeometry}
 from '../src/operator-ach-mich-details.ts';
import {createHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';
test('H5.9 fastened chin cup sits beneath jaw and straps remain four-point',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const paths=achMichRetentionPaths(shell);
  assert.equal(paths.length,6);
  assert.deepEqual(paths[0].at(-1),paths[1].at(-1));
  assert.deepEqual(paths[3].at(-1),paths[4].at(-1));
  const geo=createAchMichRetentionGeometry(shell);
  assert.equal(geo.userData.integratedChinCup,true);
  assert.ok(geo.boundingBox?.min.y < -1.2);
 }
});
test('H5.9 unfastened geometry independently hangs outside both sides of face',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const g=kit.modules.unfastened;
  const box=new THREE.Box3().setFromObject(g);
  assert.ok(box.min.y<-1,'released strap does not hang below jaw');
  assert.ok(box.min.x<-5&&box.max.x>5,'both strap tails must hang at sides');
  assert.equal(g.children.some(c=>c.name==='connected-chin-cup'),false);
 }
});
