import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';
const identities={
 strobe:['manta-curved-base','manta-diffuser-window'],
 counterweight:['rear-counterweight-textile-pouch','individual-weight-compartment'],
 battery:['facet-backed-helmet-battery','battery-cable-port'],
 light:['mlps-rail-mount','faceted-lamp-barrel','forward-white-lens'],
 camera:['action-camera-faceted-housing','camera-large-round-optic'],
 chemlight:['round-contained-chemlight','chemlight-molded-end-cap']
};
test('H9.7: every modern add-on has its own recognizable mounted silhouette',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  for(const [name,expected] of Object.entries(identities)){
   const g=kit.modules[name];
   assert.equal(g.userData.h9SpecificAddon,name);
   assert.equal(g.userData.h9SurfaceFitted,true);
   assert.ok(g.userData.h9AddonGraphicScale>=1.3,
    shell+' '+name+' still undersized at game zoom');
   const anchors=g.children.filter(x=>x.userData.h9RealCoverNormal);
   assert.equal(anchors.length,1,shell+' '+name+' must mount to real fabric');
   const n=new THREE.Vector3(...anchors[0].userData.h9RealCoverNormal);
   assert.ok(Math.abs(n.length()-1)<1e-3);
   for(const id of expected)assert.ok(g.getObjectByName(id),shell+' missing '+id);
   assert.ok(new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()).length()>1);
   updateHelmetFieldLayers(kit,{[name]:true},0x62705d,true);
   assert.equal(g.visible,true);
  }
  const counter=kit.modules.counterweight.children.find(x=>
   x.name==='helmet-addon-fitted-socket');
  const battery=kit.modules.battery.children.find(x=>
   x.name==='helmet-addon-fitted-socket');
  assert.ok(counter&&battery);
  assert.ok(Math.abs(battery.position.x-counter.position.x)<.1,
   shell+' rear weight/battery modules share a centered exclusive mounting zone');
 }
});
test('H9.7: historical PASGT excludes modern unsupported modules',()=>{
 const kit=createHelmetFieldLayers(new THREE.Group(),'pasgt');
 for(const name of ['counterweight','battery','light','camera']){
  assert.equal(kit.modules[name].children.length,0,name);
  updateHelmetFieldLayers(kit,{[name]:true},0x62705d,true);
  assert.equal(kit.modules[name].visible,false);
 }
});
