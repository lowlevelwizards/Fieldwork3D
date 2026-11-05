import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers}
 from '../src/operator-wardrobe-head-visuals.ts';

const layersFor=(lazy)=> {
 const head=new THREE.Group(),canonical=new THREE.Group();
 const cloth=new THREE.MeshStandardMaterial({color:0x676c64});
 return createWardrobeHeadLayers(head,canonical,cloth,cloth,cloth,cloth,lazy);
};

test('Quick Play battlefield rigs start without constructing any eyewear',()=>{
 const layers=layersFor(true);
 for(const id of [
  'glasses-standard','glasses-aviator','glasses-wrap','glasses-shield',
  'goggles-low','goggles-field','goggles-retro'
 ])assert.equal(layers.eyewear[id].children.length,0,id+' was built unnecessarily');
 updateWardrobeHeadLayers(layers,'ach','face-none','eyes-none','comms-none');
 assert.equal(layers.eyewear['glasses-standard'].children.length,0);
 assert.equal(layers.eyewear['goggles-retro'].children.length,0);
});

test('Selected eyewear is constructed once and preserves subtypes and placement',()=>{
 const layers=layersFor(true);
 const goggles=layers.eyewear['goggles-retro'];
 updateWardrobeHeadLayers(layers,'ach','face-none','goggles-retro','comms-none',
  undefined,undefined,{eyePosition:'raised'});
 const model=goggles.children.find(x=>x.userData.modelAxes);
 assert.ok(model,'selected eyewear should be constructed when first worn');
 assert.deepEqual(model.children.filter(x=>x.visible)
   .map(x=>x.userData.d2GogglePlacement),['helmet']);
 updateWardrobeHeadLayers(layers,'ach','face-none','goggles-retro','comms-none',
  undefined,undefined,{eyePosition:'eyes'});
 assert.equal(goggles.children.find(x=>x.userData.modelAxes),model,
  'existing selected eyewear must be reused');
 assert.deepEqual(model.children.filter(x=>x.visible)
   .map(x=>x.userData.d2GogglePlacement),['eyes']);
 const glasses=layers.eyewear['glasses-standard'];
 updateWardrobeHeadLayers(layers,'bare','face-none','glasses-standard','comms-none',
  undefined,undefined,{eyeMode:'round'});
 const glassModel=glasses.children.find(x=>x.userData.modelAxes);
 assert.deepEqual(glassModel.children.filter(x=>x.visible)
   .map(x=>x.userData.d2EyeVariant),['round']);
 assert.equal(layers.eyewear['glasses-shield'].children.length,0,
  'styles never chosen must remain unbuilt');
});

test('Operator Studio and existing Lab callers retain eager eyewear models',()=>{
 const layers=layersFor(false);
 for(const id of ['glasses-standard','goggles-retro'])
  assert.ok(layers.eyewear[id].children.length>0,id+' preview was lost');
});
