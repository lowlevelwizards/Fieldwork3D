import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readWardrobe} from '../src/operator-wardrobe-data.ts';
import {D2_FACE_SOLID_COLORS,effectiveD2FabricMode} from '../src/operator-head-accessory-catalog.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers} from '../src/operator-wardrobe-head-visuals.ts';
test('D2-A3 fabric solids validate and survive existing v1 saves',()=>{
 const look=readWardrobe({version:1,d2FaceSolid:'coyote',d2FaceMode:'nose',
  styles:{facewear:'gaiter',headwear:'beanie'}});
 assert.equal(look.d2FaceSolid,'coyote');
 assert.equal(look.d2FaceMode,'nose');
 assert.equal(readWardrobe({...look,d2FaceSolid:'laser'}).d2FaceSolid,undefined);
});
test('head wrapped shemagh avoids physically intersecting an approved helmet',()=>{
 assert.equal(effectiveD2FabricMode('shemagh','head-wrap','bare'),'head-wrap');
 assert.equal(effectiveD2FabricMode('shemagh','head-wrap','ach'),'face-wrap');
 assert.equal(effectiveD2FabricMode('shemagh','head-wrap','boonie'),'face-wrap');
 assert.equal(effectiveD2FabricMode('bandana','raised','ach'),'raised');
});
test('facewear solid is independent and does not recolor the supplied headwear material',()=>{
 const m=new THREE.MeshStandardMaterial({color:0x889977});
 const head=new THREE.Group(),canonical=new THREE.Group();head.add(canonical);
 const layers=createWardrobeHeadLayers(head,canonical,m,m,m,m);
 const color=m.color.getHex(),material=layers.faceFabric;
 updateWardrobeHeadLayers(layers,'bare','gaiter','eyes-none','comms-none','nose','coyote');
 assert.equal(layers.faceFabric.color.getHex(),D2_FACE_SOLID_COLORS.coyote.hex);
 assert.equal(m.color.getHex(),color);
 updateWardrobeHeadLayers(layers,'bare','gaiter','eyes-none','comms-none','nose','black');
 assert.equal(layers.faceFabric,material);
 assert.equal(layers.faceFabric.color.getHex(),D2_FACE_SOLID_COLORS.black.hex);
});
