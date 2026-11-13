import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {achMichRetentionPaths,createAchMichDetails,achMichHemY,
 ACH_MICH_BINDING_HEIGHT} from '../src/operator-ach-mich-details.ts';
import {createHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';

test('H5.1: connected chin cup and jaw junction, visible screws above rim',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const paths=achMichRetentionPaths(shell);
  assert.equal(paths.length,6);
  assert.deepEqual(paths[0].at(-1),paths[1].at(-1));
  assert.deepEqual(paths[0].at(-1),paths[2][0]);
  assert.deepEqual(paths[3].at(-1),paths[4].at(-1));
  assert.deepEqual(paths[3].at(-1),paths[5][0]);
  const kit=createAchMichDetails(new THREE.Group(),shell);
  assert.equal(kit.strap.userData.achMichFourPoint,true);
  assert.ok(kit.strap.getObjectByName('fastened-four-point-adjustment-buckle'));
  for(const screw of kit.hardware.children){
   if(screw.name!=='ach-mich-retention-screw')continue;
   assert.ok(screw.position.y>achMichHemY(shell,screw.position.z)+ACH_MICH_BINDING_HEIGHT);
  }
 }
});
test('H5.1: hanging tails are full-width geometry and reach below jaw',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const hanging=kit.modules.unfastened;
  // Static material consolidation may merge webbing into one mesh.
  const geometry=[];
  hanging.traverse(obj=>{if(obj instanceof THREE.Mesh)geometry.push(obj)});
  assert.ok(geometry.length>=1);
  const bounds=new THREE.Box3().setFromObject(hanging);
  assert.ok(bounds.min.y<-.5,shell+' dangling strap still tiny');
  assert.ok(bounds.max.y>2.5);
 }
});
