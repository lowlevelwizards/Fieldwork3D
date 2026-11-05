import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';
import {readWardrobe,wardrobeItemsForSlot} from '../src/operator-wardrobe-data.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers} from '../src/operator-wardrobe-head-visuals.ts';
import {D2_LENS_MATERIALS,D2_FRAME_COLORS} from '../src/operator-head-accessory-catalog.ts';
const frame=new THREE.MeshStandardMaterial({color:0x282d2e});
const lens=new THREE.MeshStandardMaterial({color:0xdedede,transparent:true,opacity:.19});
test('D2-B1 eyewear all four silhouettes use canonical front and nonempty lens/frame shapes',()=>{
 for(const id of ['glasses-standard','glasses-aviator','glasses-wrap','glasses-shield']){
  const g=createD2Glasses(id,frame,lens);
  assert.equal(g.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
  let lenses=0,frames=0;
  g.traverse(o=>{if(o.isMesh){if(o.name.endsWith('-lens'))lenses++;else frames++;}});
  assert.ok(lenses>=1,id);
  assert.ok(frames>=2&&frames<=12,id+' should use few iconic parts');
  const bb=new THREE.Box3().setFromObject(g);
  assert.ok(bb.min.z< -4.3&&bb.max.z>1.5,id);
 }
 const standard=createD2Glasses('glasses-standard',frame,lens);
 assert.deepEqual(standard.children.map(x=>x.userData.d2EyeVariant),
  ['rectangular','round','heavy-square']);
 assert.deepEqual(standard.children.filter(x=>x.visible).map(x=>x.userData.d2EyeVariant),['rectangular']);
 const shield=createD2Glasses('glasses-shield',frame,lens);
 assert.equal(shield.children.filter(x=>x.name?.endsWith('-lens')).length,1);
});
test('legacy glasses migrate without orphaning newer glasses and without duplicates',()=>{
 for(const [old,id,tint] of [
  ['clear-glasses','glasses-standard','clear'],
  ['sunglasses','glasses-wrap','smoke'],
  ['safety-glasses','glasses-shield','clear']
 ]){
  const w=readWardrobe({version:1,styles:{eyewear:old}});
  assert.equal(w.styles.eyewear,id);
  assert.equal(w.d2Accessories.eyeTint,tint);
 }
 const cards=wardrobeItemsForSlot('eyewear');
 assert.equal(cards.filter(x=>x.id.startsWith('glasses-')).length,4);
 assert.equal(cards.some(x=>x.id==='clear-glasses'),false);
});
test('eyewear frame/lens finishes update in place and preserve variant selection',()=>{
 const m=new THREE.MeshStandardMaterial({color:0x8c9890});
 const head=new THREE.Group(),canonical=new THREE.Group();head.add(canonical);
 const layers=createWardrobeHeadLayers(head,canonical,m,m,m,m);
 updateWardrobeHeadLayers(layers,'bare','face-none','glasses-standard','comms-none',
  undefined,undefined,{eyeFrame:'tan',eyeTint:'amber',eyeMode:'round'});
 assert.equal(layers.eyewearFrame.color.getHex(),D2_FRAME_COLORS.tan.hex);
 assert.equal(layers.eyewearLens.opacity,D2_LENS_MATERIALS.amber.opacity);
 const standard=layers.eyewear['glasses-standard'].children.find(x=>x.userData.modelAxes);
 assert.deepEqual(standard.children.filter(x=>x.visible).map(x=>x.userData.d2EyeVariant),['round']);
 updateWardrobeHeadLayers(layers,'bare','face-none','glasses-standard','comms-none',
  undefined,undefined,{eyeFrame:'black',eyeTint:'clear',eyeMode:'rectangular'});
 assert.deepEqual(standard.children.filter(x=>x.visible).map(x=>x.userData.d2EyeVariant),['rectangular']);
});
