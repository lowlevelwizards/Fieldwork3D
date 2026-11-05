import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWardrobeGearLayers,updateWardrobeGearLayers}
 from '../src/operator-wardrobe-gear-visuals.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers}
 from '../src/operator-wardrobe-head-visuals.ts';

const material=hex=>new THREE.MeshStandardMaterial({color:hex});
const meshCount=root=>{
 let count=0;
 root.traverse(node=>{if(node instanceof THREE.Mesh)count++;});
 return count;
};
const makeGear=lazy=>{
 const chest=new THREE.Group(),hip=new THREE.Group();
 const pack=new THREE.Mesh(new THREE.BufferGeometry(),material(0x445544));
 chest.add(pack);
 const armor=material(0x536353),gear=material(0x4c5d4c);
 const trim=material(0xa1a195),dark=material(0x252825);
 gear.userData.fieldworkFabric=true;
 const layers=createWardrobeGearLayers(chest,hip,pack,armor,gear,armor,
  dark,trim,lazy);
 return {chest,hip,layers};
};
const groupStats=group=>{
 let meshes=0,vertices=0;
 group.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;
  meshes++;vertices+=node.geometry.getAttribute('position')?.count??0;
 });
 return {meshes,vertices};
};
test('battlefield builds only chosen armor and chest-rig styles',()=>{
 const lazy=makeGear(true);
 assert.deepEqual(Object.keys(lazy.layers.armor),['armor-bare']);
 assert.deepEqual(Object.keys(lazy.layers.rig),['no-rig']);
 updateWardrobeGearLayers(lazy.layers,'plate-jpc','micro-rig',
  'plain-belt','assault-pack','bdu-shirt');
 assert.deepEqual(Object.keys(lazy.layers.armor).sort(),
  ['armor-bare','plate-jpc']);
 assert.deepEqual(Object.keys(lazy.layers.rig).sort(),
  ['micro-rig','no-rig']);
 assert.ok(groupStats(lazy.layers.armor['plate-jpc']).vertices>0);
 assert.ok(groupStats(lazy.layers.rig['micro-rig']).vertices>0);
 const first=lazy.layers.rig['micro-rig'];
 updateWardrobeGearLayers(lazy.layers,'plate-jpc','micro-rig',
  'plain-belt','assault-pack','bdu-shirt');
 assert.equal(lazy.layers.rig['micro-rig'],first,
  'selected rig geometry must not be rebuilt every frame');
 updateWardrobeGearLayers(lazy.layers,'soft-vest','chicom-rig',
  'plain-belt','assault-pack','acu-shirt');
 assert.ok(lazy.layers.armor['soft-vest']);
 assert.ok(lazy.layers.rig['chicom-rig']);
 assert.equal(lazy.layers.rig['micro-rig'],first,
  'the previous rig is retained for later wardrobe changes');
});
test('lazy selected armor/rig geometry matches eager lab silhouette',()=>{
 const lazy=makeGear(true),eager=makeGear(false);
 assert.ok(meshCount(eager.chest)>meshCount(lazy.chest)*2,
  'lazy constructor must skip most unselected authored geometry');
 for(const [armor,rig,top] of [
  ['plate-jpc','micro-rig','bdu-shirt'],
  ['plate-heavy','sadf-webbing','smock-jacket'],
  ['soft-vest','full-chest','acu-shirt']
 ]){
  updateWardrobeGearLayers(lazy.layers,armor,rig,'plain-belt','assault-pack',top);
  updateWardrobeGearLayers(eager.layers,armor,rig,'plain-belt','assault-pack',top);
  assert.deepEqual(groupStats(lazy.layers.armor[armor]),
   groupStats(eager.layers.armor[armor]),armor+' geometry parity');
  assert.deepEqual(groupStats(lazy.layers.rig[rig]),
   groupStats(eager.layers.rig[rig]),rig+' geometry parity');
 }
});
const makeHead=lazy=>{
 const head=new THREE.Group(),canonical=new THREE.Group();
 const cloth=material(0x556450),armor=material(0x465448);
 const dark=material(0x252925),skin=material(0xbda385);
 const layers=createWardrobeHeadLayers(head,canonical,cloth,armor,dark,skin,lazy);
 return {head,canonical,layers};
};
test('battlefield headgear, facewear and headsets build only when worn',()=>{
 const lazy=makeHead(true);
 assert.equal(groupStats(lazy.layers.headwear['pasgt']).vertices,0);
 assert.equal(groupStats(lazy.layers.facewear['gas-m50']).vertices,0);
 assert.equal(groupStats(lazy.layers.headset['boom-headset']).vertices,0);
 updateWardrobeHeadLayers(lazy.layers,'pasgt','gas-m50','eyes-none','boom-headset');
 for(const group of [lazy.layers.headwear['pasgt'],
  lazy.layers.facewear['gas-m50'],lazy.layers.headset['boom-headset']])
  assert.ok(groupStats(group).vertices>0);
 assert.equal(groupStats(lazy.layers.headwear['boonie']).vertices,0,
  'other hats must stay deferred');
 assert.equal(groupStats(lazy.layers.facewear['gas-m40']).vertices,0,
  'other respirators must stay deferred');
 const before=lazy.layers.headwear['pasgt'].children[0];
 updateWardrobeHeadLayers(lazy.layers,'pasgt','gas-m50','eyes-none','boom-headset');
 assert.equal(lazy.layers.headwear['pasgt'].children[0],before,
  'headgear should not rebuild on identical appearance');
 updateWardrobeHeadLayers(lazy.layers,'ach','balaclava-three',
  'eyes-none','headset-none','two-hole');
 assert.ok(lazy.layers.twoHoleMouthCover,
  'balaclava variant must preserve its mouth-cover option');
 assert.equal(lazy.layers.twoHoleMouthCover?.visible,true);
 updateWardrobeHeadLayers(lazy.layers,'ach','balaclava-three',
  'eyes-none','headset-none','three-hole');
 assert.equal(lazy.layers.twoHoleMouthCover?.visible,false);
});
test('eager lab and lazy battlefield variants retain the same solid geometry',()=>{
 const eager=makeHead(false),lazy=makeHead(true);
 for(const headwear of ['pasgt','boonie','ach','high-cut-rails']){
  updateWardrobeHeadLayers(eager.layers,headwear,'face-none',
   'eyes-none','headset-none');
  updateWardrobeHeadLayers(lazy.layers,headwear,'face-none',
   'eyes-none','headset-none');
  assert.deepEqual(groupStats(lazy.layers.headwear[headwear]),
   groupStats(eager.layers.headwear[headwear]),headwear+' parity');
 }
 assert.ok(meshCount(eager.canonical)>meshCount(lazy.canonical),
  'the eager Studio catalog must retain the full rendered library');
});
