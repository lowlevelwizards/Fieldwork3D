import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2FabricWrap} from '../src/operator-d2-fabric-wraps.ts';
import {readWardrobe,wardrobeItemsForSlot} from '../src/operator-wardrobe-data.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers} from '../src/operator-wardrobe-head-visuals.ts';
const fabric=new THREE.MeshStandardMaterial({color:0x444f41});
test('D2-A2 wraps are three connected families with prebuilt, distinct wear states',()=>{
 const cases={gaiter:['lowered','mouth','nose'],
  shemagh:['draped','face-wrap','head-wrap'],bandana:['raised','lowered']};
 for(const [id,modes] of Object.entries(cases)){
  const g=createD2FabricWrap(id,fabric);
  assert.equal(g.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
  assert.deepEqual(g.children.map(x=>x.userData.d2WrapMode),modes);
  for(const mode of g.children){assert.ok(mode.children.length>=4,id+':'+mode.userData.d2WrapMode);
   const bounds=new THREE.Box3().setFromObject(mode);
   assert.ok(bounds.min.z<0&&bounds.max.z>0);}
 }
 const g=createD2FabricWrap('gaiter',fabric);
 const hs=g.children.map(x=>new THREE.Box3().setFromObject(x).max.y);
 assert.ok(hs[0]<hs[1]&&hs[1]<hs[2],'lowered/mouth/nose differ in height');
});
test('legacy scarf migrates without adding a duplicate model card',()=>{
 const w=readWardrobe({version:1,styles:{facewear:'scarf'},d2FaceMode:'draped'});
 assert.equal(w.styles.facewear,'shemagh');
 assert.equal(w.d2FaceMode,'draped');
 const cards=wardrobeItemsForSlot('facewear');
 assert.equal(cards.some(x=>x.id==='scarf'),false);
 assert.equal(cards.some(x=>x.id==='bandana'),true);
});
test('real wardrobe head layer switches wrap state with zero reallocation',()=>{
 const head=new THREE.Group();
 const canonical=new THREE.Group();head.add(canonical);
 const layers=createWardrobeHeadLayers(head,canonical,fabric,fabric,fabric,fabric);
 const wrap=layers.facewear.gaiter.children.find(x=>x.userData.modelAxes);
 assert.ok(wrap);
 const geometries=wrap.children.flatMap(x=>x.children.map(y=>y.geometry));
 updateWardrobeHeadLayers(layers,'bare','gaiter','eyes-none','comms-none','lowered');
 assert.deepEqual(wrap.children.filter(x=>x.visible).map(x=>x.userData.d2WrapMode),['lowered']);
 updateWardrobeHeadLayers(layers,'bare','gaiter','eyes-none','comms-none','nose');
 assert.deepEqual(wrap.children.filter(x=>x.visible).map(x=>x.userData.d2WrapMode),['nose']);
 assert.deepEqual(wrap.children.flatMap(x=>x.children.map(y=>y.geometry)),geometries);
});
