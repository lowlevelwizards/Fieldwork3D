import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';
import {readHelmetField,resolveHelmetField}
 from '../src/operator-helmet-field-policy.ts';
test('H7 helmet visuals are built once, then visibility-only for every shell',()=>{
 for(const shell of ['ach','mich-2001','mich-2002','pasgt']){
  const parent=new THREE.Group(),layers=createHelmetFieldLayers(parent,shell);
  const modules=layers.modules;
  const original=Object.values(modules).map(g=>g.uuid);
  const field=readHelmetField({band:true,concealment:'foliage-medium',
   fastened:false,shroud:true,rails:true,bungees:true,
   velcro:true,goggles:'rear',goggleSleeve:true,strobe:true,
   counterweight:true,battery:true,light:true,camera:true,chemlight:true,patches:true});
  updateHelmetFieldLayers(layers,field,0xa88c63,true);
  assert.equal(modules.band.visible,shell!=='pasgt');
  assert.equal(modules.unfastened.visible,true);
  assert.equal(modules.shroud.visible,true);
  assert.equal(modules['goggles-rear'].visible,true);
  assert.equal(modules.rails.visible,shell!=='pasgt');
  assert.equal(modules.camera.visible,shell!=='pasgt');
  assert.equal(modules.leaves.visible,shell!=='pasgt');
  assert.equal(modules.chemlight.visible,shell==='pasgt');
  assert.equal(modules['goggles-front'].visible,false);
  assert.equal(modules['goggles-rear'].getObjectByName('goggle-fabric-sleeve')?.visible,true);
  updateHelmetFieldLayers(layers,{...field,goggles:'front',
   fastened:true,concealment:'none'},0x27313a,false);
  assert.equal(modules['goggles-front'].visible,true);
  assert.equal(modules['goggles-rear'].visible,false);
  assert.equal(modules.unfastened.visible,false);
  assert.deepEqual(Object.values(modules).map(g=>g.uuid),original);
  assert.deepEqual(resolveHelmetField(shell,field).band,true);
 }
});
