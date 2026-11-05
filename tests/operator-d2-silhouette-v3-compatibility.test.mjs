import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {D2_FACEWEAR,effectiveD2FabricMode,
 resolveD2HeadAssembly,D2_FACE_SOLID_COLORS}
 from '../src/operator-head-accessory-catalog.ts';
import {readWardrobe} from '../src/operator-wardrobe-data.ts';
import {createD2Balaclava} from '../src/operator-d2-fabric-visuals.ts';
import {createD2FabricWrap} from '../src/operator-d2-fabric-wraps.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers}
 from '../src/operator-wardrobe-head-visuals.ts';
const cloth=new THREE.MeshStandardMaterial({color:0x55664b});
test('V3 keeps every first-wave D2 model and every saved wearing-mode ID',()=>{
 assert.equal(D2_FACEWEAR.length,12);
 assert.deepEqual(D2_FACEWEAR.find(x=>x.id==='gaiter').modes,
  ['lowered','mouth','nose']);
 assert.deepEqual(D2_FACEWEAR.find(x=>x.id==='shemagh').modes,
  ['draped','face-wrap','head-wrap']);
 assert.deepEqual(D2_FACEWEAR.find(x=>x.id==='bandana').modes,['raised','lowered']);
 const styles=['balaclava-one','balaclava-three','balaclava-open',
  'gaiter','shemagh','bandana'];
 for(const facewear of styles){
  const w=readWardrobe({version:1,styles:{facewear},
   d2FaceSolid:'olive'});
  assert.equal(w.styles.facewear,facewear);
  assert.equal(w.d2FaceSolid,'olive');
 }
 for(const [facewear,mode] of [
  ['balaclava-three','two-hole'],['gaiter','mouth'],['gaiter','nose'],
  ['shemagh','head-wrap'],['bandana','lowered']
 ]){
  const w=readWardrobe({version:1,styles:{facewear},d2FaceMode:mode});
  assert.equal(w.styles.facewear,facewear);
  assert.equal(w.d2FaceMode,mode);
 }
});
test('V3 head-wrap respects compatible headgear without destroying saved mode',()=>{
 assert.equal(effectiveD2FabricMode('shemagh','head-wrap','bare'),'head-wrap');
 for(const hat of ['ach','high-cut','pasgt','boonie','beanie']){
  assert.equal(effectiveD2FabricMode('shemagh','head-wrap',hat),'face-wrap');
 }
 assert.equal(effectiveD2FabricMode('bandana','raised','ach'),'raised');
});
test('V3 poses only toggle preallocated modes, preserve the exact cloth material',()=>{
 const h=new THREE.Group(),canon=new THREE.Group();h.add(canon);
 const layers=createWardrobeHeadLayers(h,canon,cloth,cloth,cloth,cloth);
 const models=Object.fromEntries(['gaiter','shemagh','bandana'].map(id=>
  [id,layers.facewear[id].children.find(x=>x.userData.modelAxes)]));
 const snapshot=Object.fromEntries(Object.entries(models).map(([id,g])=>
  [id,g.children.map(mode=>mode.children[0].geometry)]));
 for(const [id,modes] of [
  ['gaiter',['lowered','mouth','nose']],
  ['shemagh',['draped','face-wrap','head-wrap']],
  ['bandana',['raised','lowered']]
 ]){
  for(const mode of modes){
   updateWardrobeHeadLayers(layers,'bare',id,'eyes-none','comms-none',
    mode,'olive');
   assert.deepEqual(models[id].children.filter(g=>g.visible)
    .map(g=>g.userData.d2WrapMode),[mode]);
   assert.equal(layers.faceFabric.color.getHex(),D2_FACE_SOLID_COLORS.olive.hex);
   assert.equal(layers.faceFabric,models[id].children[0].children[0].material);
   assert.deepEqual(models[id].children.map(g=>g.children[0].geometry),snapshot[id]);
  }
 }
 assert.equal(cloth.color.getHex(),0x55664b,'original outfit material unchanged');
});
test('V3 balaclava geometry stays preallocated with unique visible apertures',()=>{
 for(const id of ['balaclava-one','balaclava-three','balaclava-open']){
  const root=createD2Balaclava(id,cloth);
  assert.equal(root.children.filter(x=>x.userData.d2ClothExterior).length,1);
  const g=root.children[0].geometry;
  assert.equal(g.userData.greedyCuboidUnion,true);
  assert.ok(g.getAttribute('position').count<5000,
   'keep fixed low-poly budget and visual consistency');
 }
});
