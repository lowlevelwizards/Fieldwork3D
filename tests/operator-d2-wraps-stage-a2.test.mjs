import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2FabricWrap} from '../src/operator-d2-fabric-wraps.ts';
import {readWardrobe,wardrobeItemsForSlot} from '../src/operator-wardrobe-data.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers} from '../src/operator-wardrobe-head-visuals.ts';
const cloth=new THREE.MeshStandardMaterial({color:0x455149});
test('D2-F3/F4 three distinct cloth families each have joined geometry for every mode',()=>{
 const cases={gaiter:['lowered','mouth','nose'],
  shemagh:['draped','face-wrap','head-wrap'],bandana:['raised','lowered']};
 for(const [id,modes] of Object.entries(cases)){
  const root=createD2FabricWrap(id,cloth);
  assert.equal(root.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
  assert.deepEqual(root.children.map(x=>x.userData.d2WrapMode),modes);
  assert.equal(root.children.filter(x=>x.visible).length,1);
  for(const mode of root.children){
   assert.ok(mode.children.length>=1,id+' '+mode.name);
   assert.ok(mode.children.every(x=>x.userData.d2ClothExterior),'no floating spare boxes');
   const bounds=new THREE.Box3().setFromObject(mode);
   assert.ok(bounds.min.z<0&&bounds.max.z>0,id+' wraps around actual skull/neck');
  }
 }
 const g=createD2FabricWrap('gaiter',cloth);
 const hs=g.children.map(x=>new THREE.Box3().setFromObject(x).max.y);
 assert.ok(hs[0]<hs[1]&&hs[1]<hs[2],'lowered/mouth/nose differ in height');
});
test('triangular scarf and bandana silhouettes extend downward, not across a rigid head box',()=>{
 const scarf=createD2FabricWrap('shemagh',cloth);
 const triangle=new THREE.Box3().setFromObject(scarf.children[0]);
 assert.ok(triangle.min.y< -6.2,'draped scarf extends onto chest');
 const scarfHood=new THREE.Box3().setFromObject(scarf.children[2]);
 assert.ok(scarfHood.max.y>7,'headwrap actually covers crown');
 const bandana=createD2FabricWrap('bandana',cloth);
 const raised=new THREE.Box3().setFromObject(bandana.children[0]);
 assert.ok(raised.min.y<0&&raised.max.y>3,'bandana covers nose and tapers below chin');
 const lowered=new THREE.Box3().setFromObject(bandana.children[1]);
 assert.ok(lowered.max.y<.5,'lowered bandana remains below mouth');
});
test('legacy scarf migration retains a single shemagh selection',()=>{
 const w=readWardrobe({version:1,styles:{facewear:'scarf'},d2FaceMode:'draped'});
 assert.equal(w.styles.facewear,'shemagh');
 assert.equal(w.d2FaceMode,'draped');
 const cards=wardrobeItemsForSlot('facewear');
 assert.equal(cards.some(x=>x.id==='scarf'),false);
 assert.equal(cards.some(x=>x.id==='bandana'),true);
});
test('live wardrobe head modes switch without mesh or geometry churn',()=>{
 const head=new THREE.Group(),canonical=new THREE.Group();head.add(canonical);
 const layers=createWardrobeHeadLayers(head,canonical,cloth,cloth,cloth,cloth);
 const wrap=layers.facewear.gaiter.children.find(x=>x.userData.modelAxes);
 assert.ok(wrap);
 const meshes=wrap.children.map(x=>x.children[0]);
 const geo=meshes.map(x=>x.geometry);
 updateWardrobeHeadLayers(layers,'bare','gaiter','eyes-none','comms-none','lowered');
 assert.deepEqual(wrap.children.filter(x=>x.visible).map(x=>x.userData.d2WrapMode),['lowered']);
 updateWardrobeHeadLayers(layers,'bare','gaiter','eyes-none','comms-none','nose');
 assert.deepEqual(wrap.children.filter(x=>x.visible).map(x=>x.userData.d2WrapMode),['nose']);
 assert.deepEqual(wrap.children.map(x=>x.children[0]),meshes);
 assert.deepEqual(wrap.children.map(x=>x.children[0].geometry),geo);
});
