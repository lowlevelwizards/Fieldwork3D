import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Mask} from '../src/operator-d2-mask-visuals.ts';
import {readWardrobe,wardrobeItemsForSlot} from '../src/operator-wardrobe-data.ts';
import {D2_FACEWEAR,D2_EYEWEAR,resolveD2HeadAssembly} from '../src/operator-head-accessory-catalog.ts';
const mat=new THREE.MeshStandardMaterial({color:0x313a34});
const materials={rubber:mat,hardware:mat,filters:mat,lens:mat};
test('D2-C3 four full masks each retain their structurally distinct filter and visor family',()=>{
 const gp=createD2Mask('gas-gp5',materials);
 const m17=createD2Mask('gas-m17',materials);
 const m40=createD2Mask('gas-m40',materials);
 const m50=createD2Mask('gas-m50',materials);
 assert.ok(gp.getObjectByName('gp5-central-canister'));
 assert.ok(m17.getObjectByName('m17-integrated-cheek-filter'));
 assert.ok(m40.getObjectByName('m40-projecting-side-canister'));
 assert.equal(m40.getObjectByName('m17-integrated-cheek-filter'),undefined);
 const lenses=[];m50.traverse(x=>{if(x.name==='m50-one-piece-panoramic-visor-lens')lenses.push(x);});
 assert.equal(lenses.length,1,'M50 has one continuous visor, not twin rounds');
 const cheek=[];m50.traverse(x=>{if(x.name==='m50-twin-low-cheek-filter')cheek.push(x);});
 assert.equal(cheek.length,2,'M50 has twin close-fitting cheek cartridges');
 const m40Filters=[];m40.traverse(x=>{if(x.name==='m40-projecting-side-canister')m40Filters.push(x);});
 assert.equal(m40Filters.length,1);
 const m40Windows=[];
 m40.traverse(x=>{if(x.name==='m40-angular-eyepiece-lens')m40Windows.push(x);});
 assert.equal(m40Windows.length,2,'M40 angular eyepieces contrast with GP-5 rounds');
 assert.equal(m40.getObjectByName('m40-round-eye-lens'),undefined);
});
test('D2 launch catalog includes exactly six fabric, six masks, seven eyewear models',()=>{
 assert.equal(D2_FACEWEAR.length,12);
 assert.equal(D2_EYEWEAR.length,7);
 const face=wardrobeItemsForSlot('facewear');
 const eye=wardrobeItemsForSlot('eyewear');
 assert.equal(face.length,13);
 assert.equal(eye.length,8);
 assert.ok(face.some(x=>x.id==='gas-m50'));
 assert.ok(!face.some(x=>x.id==='gas-mask'));
 assert.equal(face.filter(x=>x.id.startsWith('gas-')).length,4);
 assert.equal(face.filter(x=>x.id.includes('balaclava')).length,3);
});
test('legacy generic gas mask loads M40; full masks suppress separate goggles and boom mic reversibly',()=>{
 const saved=readWardrobe({version:1,styles:{
  facewear:'gas-mask',eyewear:'goggles-up',headset:'boom-headset'
 }});
 assert.equal(saved.styles.facewear,'gas-m40');
 assert.equal(saved.styles.eyewear,'goggles-field');
 assert.equal(saved.d2Accessories.eyePosition,'raised');
 const masked=resolveD2HeadAssembly({
  facewear:saved.styles.facewear,eyewear:saved.styles.eyewear,
  headset:saved.styles.headset,headwear:'ach',
  options:saved.d2Accessories
 });
 assert.equal(masked.eyewear,'eyes-none');
 assert.equal(masked.headset,'comms-none');
 const unmasked=resolveD2HeadAssembly({
  facewear:'gaiter',eyewear:saved.styles.eyewear,
  headset:saved.styles.headset,headwear:'ach',
  options:saved.d2Accessories
 });
 assert.equal(unmasked.eyewear,'goggles-field');
 assert.equal(unmasked.eyewearPlacement,'helmet');
});
