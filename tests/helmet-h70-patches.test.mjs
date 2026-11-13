import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';
test('H7.0 taller side patches retain batched geometry and other addon sockets',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  assert.equal(kit.modules.velcro.userData.h70SidePatchHeightRatio,1.20);
  const before=new Map(Object.entries(kit.modules).map(([k,g])=>[k,g.uuid]));
  for(const covered of [false,true])
   updateHelmetFieldLayers(kit,{velcro:true,shroud:true,rails:true,strobe:true},0x77866a,covered);
  for(const [k,id] of before)assert.equal(kit.modules[k].uuid,id);
  const bounds=new THREE.Box3().setFromObject(kit.modules.velcro);
  assert.ok(Number.isFinite(bounds.min.y));
 }
});
