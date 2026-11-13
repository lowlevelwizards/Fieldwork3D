import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';
import {resolveHelmetField,readHelmetField} from '../src/operator-helmet-field-policy.ts';
test('H6.3 chemlight occupies crown rear; strobe reserves that slot',()=>{
 const s=readHelmetField({chemlight:true,strobe:true});
 assert.equal(resolveHelmetField('ach',s).chemlight,false);
 assert.equal(resolveHelmetField('ach',{chemlight:true,band:false,rails:false}).chemlight,true);
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const socket=kit.modules.chemlight.getObjectByName('helmet-addon-fitted-socket');
  assert.ok(socket);
  assert.equal(socket.userData.h63ChemlightMount,'crown-rear');
  assert.ok(socket.position.y>7);
  assert.ok(socket.position.z>1.5);
  updateHelmetFieldLayers(kit,{chemlight:true},0x66775f,true);
  assert.equal(kit.modules.chemlight.visible,true);
  updateHelmetFieldLayers(kit,{chemlight:true,strobe:true},0x66775f,true);
  assert.equal(kit.modules.chemlight.visible,false);
 }
});
