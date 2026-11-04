import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Mask} from '../src/operator-d2-mask-visuals.ts';
import {readWardrobe,wardrobeItemsForSlot} from '../src/operator-wardrobe-data.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers} from '../src/operator-wardrobe-head-visuals.ts';
import {D2_MASK_COLORS} from '../src/operator-head-accessory-catalog.ts';
const m=new THREE.MeshStandardMaterial({color:0x242a28});
const materials={rubber:m,hardware:m,filters:m,lens:m};
test('half-mask and filter respirator use distinct shells and correctly connected hardware',()=>{
 const half=createD2Mask('half-mask',materials);
 const respiratory=createD2Mask('respirator-half',materials);
 assert.equal(half.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
 assert.equal(respiratory.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
 assert.deepEqual(half.children.map(x=>x.userData.d2MaskMode),['solid','mesh']);
 assert.deepEqual(respiratory.children.map(x=>x.userData.d2MaskMode),
  ['twin-filter','compact-filter']);
 const names=[];respiratory.traverse(x=>{if(x.isMesh)names.push(x.name);});
 assert.ok(names.includes('dual-filter-canister'));
 assert.ok(names.includes('compact-front-filter'));
 assert.ok(!half.getObjectByName('dual-filter-canister'));
});
test('mask color saves independently and does not create new equipment capabilities',()=>{
 const saved=readWardrobe({version:1,styles:{facewear:'respirator-half'},
  d2MaskColor:'coyote',d2Accessories:{faceMode:'compact-filter'}});
 assert.equal(saved.d2MaskColor,'coyote');
 assert.equal(saved.d2Accessories.faceMode,'compact-filter');
 assert.equal(readWardrobe({...saved,d2MaskColor:'neon'}).d2MaskColor,undefined);
 assert.equal(wardrobeItemsForSlot('facewear').filter(x=>x.id==='respirator-half').length,1);
});
test('live head layer exposes both respiratory masks and toggles without geometry churn',()=>{
 const h=new THREE.Group(),canonical=new THREE.Group();h.add(canonical);
 const layers=createWardrobeHeadLayers(h,canonical,m,m,m,m);
 const root=layers.facewear['respirator-half'].children.find(x=>x.userData.modelAxes);
 const first=root.children[0].children[0].geometry;
 updateWardrobeHeadLayers(layers,'bare','respirator-half','eyes-none','comms-none',
  'compact-filter',undefined,undefined,'olive');
 assert.deepEqual(root.children.filter(x=>x.visible).map(x=>x.userData.d2MaskMode),['compact-filter']);
 assert.equal(layers.maskRubber.color.getHex(),D2_MASK_COLORS.olive.hex);
 updateWardrobeHeadLayers(layers,'bare','respirator-half','eyes-none','comms-none',
  'twin-filter');
 assert.deepEqual(root.children.filter(x=>x.visible).map(x=>x.userData.d2MaskMode),['twin-filter']);
 assert.equal(root.children[0].children[0].geometry,first);
});
