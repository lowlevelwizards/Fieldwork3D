import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Goggles} from '../src/operator-d2-goggle-visuals.ts';
import {readWardrobe,wardrobeItemsForSlot} from '../src/operator-wardrobe-data.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers} from '../src/operator-wardrobe-head-visuals.ts';
const frame=new THREE.MeshStandardMaterial({color:0x404645});
const lens=new THREE.MeshStandardMaterial({transparent:true,opacity:.25,color:0x9ba4a9});
test('D2-B2 has three independent goggle silhouettes and four real fit states each',()=>{
 const shapes=['goggles-low','goggles-field','goggles-retro'];
 for(const id of shapes){
  const g=createD2Goggles(id,frame,lens,frame);
  assert.equal(g.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
  assert.deepEqual(g.children.map(x=>x.userData.d2GogglePlacement),
   ['eyes','forehead','helmet','neck']);
  assert.equal(g.children.filter(x=>x.visible).length,1);
  for(const state of g.children){
   const names=[];
   state.traverse(x=>{if(x.isMesh)names.push(x.name);});
   assert.ok(names.some(x=>x.includes('strap-back')),id+' must have rear strap');
   assert.ok(names.some(x=>x.endsWith('-lens')),id+' must contain true glass');
   assert.ok(names.length>=10,id+' needs connected physical parts');
  }
 }
 const retro=createD2Goggles('goggles-retro',frame,lens,frame);
 assert.equal(retro.children[0].children.filter(x=>x.name?.endsWith('-lens')).length,2);
 const low=createD2Goggles('goggles-low',frame,lens,frame);
 assert.equal(low.children[0].children.filter(x=>x.name?.endsWith('-lens')).length,1);
});
test('goggle saved up/down styles migrate into one family and preserve placement',()=>{
 for(const [id,pose] of [['goggles-up','raised'],['goggles-down','eyes']]){
  const w=readWardrobe({version:1,styles:{eyewear:id}});
  assert.equal(w.styles.eyewear,'goggles-field');
  assert.equal(w.d2Accessories.eyePosition,pose);
  assert.equal(readWardrobe(w).d2Accessories.eyePosition,pose);
 }
 const cards=wardrobeItemsForSlot('eyewear');
 assert.equal(cards.filter(x=>x.id.startsWith('goggles-')).length,3);
 assert.equal(cards.length,8,'seven eyewear plus none');
});
test('runtime positions switch by helmet/headwear without re-creating geometry',()=>{
 const mat=new THREE.MeshStandardMaterial({color:0x565b54});
 const head=new THREE.Group(),canonical=new THREE.Group();head.add(canonical);
 const layers=createWardrobeHeadLayers(head,canonical,mat,mat,mat,mat);
 const g=layers.eyewear['goggles-low'].children.find(x=>x.userData.modelAxes);
 assert.ok(g);
 const original=g.children.map(x=>x.children[0].geometry);
 updateWardrobeHeadLayers(layers,'bare','face-none','goggles-low','comms-none',
  undefined,undefined,{eyePosition:'raised'});
 assert.deepEqual(g.children.filter(x=>x.visible).map(x=>x.userData.d2GogglePlacement),['forehead']);
 updateWardrobeHeadLayers(layers,'ach','face-none','goggles-low','comms-none',
  undefined,undefined,{eyePosition:'raised'});
 assert.deepEqual(g.children.filter(x=>x.visible).map(x=>x.userData.d2GogglePlacement),['helmet']);
 updateWardrobeHeadLayers(layers,'ach','face-none','goggles-low','comms-none',
  undefined,undefined,{eyePosition:'neck'});
 assert.deepEqual(g.children.filter(x=>x.visible).map(x=>x.userData.d2GogglePlacement),['neck']);
 assert.deepEqual(g.children.map(x=>x.children[0].geometry),original);
});
