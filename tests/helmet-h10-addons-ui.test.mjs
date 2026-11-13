import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {readHelmetField,HELMET_FIELD_DEFAULTS} from '../src/operator-helmet-field-policy.ts';
import {createHelmetFieldLayers,updateHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';

test('H10.4: recognizable larger mounts, forward-facing camera/light and accessible chemlight',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  for(const key of ['strobe','counterweight','battery','light','camera','chemlight']){
   const g=kit.modules[key];
   assert.ok(g.userData.h9AddonGraphicScale>=1.45,shell+' '+key+' too small');
  }
  const camera=kit.modules.camera.getObjectByName('forward-facing-action-camera-mount');
  assert.ok(camera);assert.ok(Math.abs(camera.rotation.y-Math.PI/2)<1e-5);
  const stick=kit.modules.chemlight.getObjectByName('round-contained-chemlight');
  assert.ok(stick);
  const rear=kit.modules.counterweight.children.find(o=>o.name==='helmet-addon-fitted-socket');
  const battery=kit.modules.battery.children.find(o=>o.name==='helmet-addon-fitted-socket');
  assert.ok(rear&&battery);assert.ok(Math.abs(battery.position.x-rear.position.x)<.1);
 }
});
test('H10.5: legacy looks get safe mounting defaults and retain preferences while disabled',()=>{
 const old=readHelmetField({camera:true,light:false,chemlight:false,band:false});
 assert.equal(old.cameraSide,'right');
 assert.equal(old.lightSide,'left');
 assert.equal(old.chemlightSide,'right');
 assert.equal(HELMET_FIELD_DEFAULTS.cameraSide,'right');
 const configured=readHelmetField({
  ...old,camera:false,cameraSide:'left',lightSide:'right',chemlightSide:'left'
 });
 assert.equal(configured.cameraSide,'left');
 const kit=createHelmetFieldLayers(new THREE.Group(),'ach');
 updateHelmetFieldLayers(kit,configured,0x586648,true);
 assert.equal(kit.modules.camera.visible,false);
 assert.equal(kit.modules.camera.scale.x,-1);
 assert.equal(kit.modules.light.scale.x,-1);
 assert.equal(kit.modules.chemlight.scale.x,-1);
 updateHelmetFieldLayers(kit,{...configured,camera:true,rails:true,band:false,concealment:'net'},0x586648,true);
 assert.equal(kit.modules.camera.visible,true);
 assert.equal(kit.modules.camera.scale.x,-1);
 assert.equal(kit.modules.band.visible,true);
});
test('H10.5: editor only reveals accessory child controls while equipped',()=>{
 const src=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
 assert.match(src,/if\(currentField\.band\|\|\(!historical&&currentField\.concealment==='net'\)\)/);
 for(const item of ['camera','light','chemlight'])
  assert.ok(src.includes('if(!historical&&currentField.'+item+')'));
 assert.match(src,/if\(currentField\.goggles==='front'\|\|currentField\.goggles==='rear'\)/);
});
