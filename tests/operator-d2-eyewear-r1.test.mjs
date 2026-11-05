import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';
import {createD2Goggles} from '../src/operator-d2-goggle-visuals.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers} from '../src/operator-wardrobe-head-visuals.ts';
import {D2_FRAME_COLORS,D2_LENS_MATERIALS} from '../src/operator-head-accessory-catalog.ts';
import {readWardrobe} from '../src/operator-wardrobe-data.ts';

const frame=new THREE.MeshStandardMaterial({color:0x282d2e});
const lens=new THREE.MeshStandardMaterial({color:0xddeeee,transparent:true,opacity:.19});
const elastic=new THREE.MeshStandardMaterial({color:0x303a31});
const meshes=root=>{const all=[];root.traverse(x=>{if(x.isMesh)all.push(x)});return all};
const boxSize=root=>new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());

const shellProfiles=root=>{
 const out=[];root.traverse(o=>{
  if(o.isMesh&&o.userData.d2EyeProfile)out.push(o.userData.d2EyeProfile);
 });return out;
};
const lensCount=root=>{
 let count=0;root.traverse(o=>{if(o.isMesh&&o.name.endsWith('-lens'))count++});
 return count;
};
test('R2 solid eyewear housings are taller with distinct lens topology',()=>{
 const expectations={
  'glasses-standard':{lenses:2,minimumHeight:2.7},
  'glasses-aviator':{lenses:2,minimumHeight:3.3},
  'glasses-wrap':{lenses:2,minimumHeight:2.7},
  'glasses-shield':{lenses:1,minimumHeight:3.4}
 };
 for(const [id,spec] of Object.entries(expectations)){
  const root=createD2Glasses(id,frame,lens);
  const visible=id==='glasses-standard'?root.children[0]:root;
  assert.equal(lensCount(visible),spec.lenses);
  const shells=shellProfiles(visible);
  assert.equal(shells.length,spec.lenses);
  assert.ok(shells.every(s=>s.height>spec.minimumHeight),id+' needs tall housings');
  assert.ok(shells.every(s=>s.housingDepth>.60),id+' needs a real 3D shell');
  assert.ok(!visible.getObjectByName('tiny-frame-detail'));
 }
 const standard=createD2Glasses('glasses-standard',frame,lens);
 assert.deepEqual(standard.children.map(x=>x.userData.d2EyeVariant),
  ['rectangular','round','heavy-square']);
 assert.deepEqual(standard.children.filter(x=>x.visible).map(x=>x.userData.d2EyeVariant),
  ['rectangular']);
 assert.ok(shellProfiles(createD2Glasses('glasses-shield',frame,lens))[0].width>8.4);
});
test('R2 protective families feature a compact seal, deep enclosure and two projected cups',()=>{
 const variants=['goggles-low','goggles-field','goggles-retro'];
 const models=variants.map(id=>createD2Goggles(id,frame,lens,frame));
 for(const model of models){
  assert.deepEqual(model.children.map(x=>x.userData.d2GogglePlacement),
   ['eyes','forehead','helmet','neck']);
  const eyes=model.children[0];
  assert.ok(eyes.getObjectByName('strap-back'));
  assert.ok(shellProfiles(eyes).every(s=>s.height>2.7));
  assert.ok(shellProfiles(eyes).every(s=>s.housingDepth>1));
 }
 assert.deepEqual(models.map(m=>lensCount(m.children[0])),[1,1,2]);
 const [low,field,retro]=models.map(m=>m.children[0]);
 assert.ok(shellProfiles(field)[0].frontZ<shellProfiles(low)[0].frontZ-.9);
 assert.equal(shellProfiles(retro).length,2);
 assert.ok(retro.getObjectByName('bold-cup-bridge'));
});
test('R1 existing frame palettes, tint and placement survive live updates without rebuilding meshes',()=>{
 const original=new THREE.MeshStandardMaterial({color:0x7c8d7c});
 const root=new THREE.Group(),head=new THREE.Group();root.add(head);
 const layers=createWardrobeHeadLayers(root,head,original,original,original,original);
 const glasses=layers.eyewear['glasses-standard'].children.find(x=>x.userData.modelAxes);
 const goggles=layers.eyewear['goggles-field'].children.find(x=>x.userData.modelAxes);
 const initialGlass=glasses.children.map(x=>meshes(x).map(m=>m.geometry));
 const initialGoggles=goggles.children.map(x=>meshes(x).map(m=>m.geometry));
 for(const [color,tint,mode] of [
  ['tan','smoke','round'],['olive','clear','heavy-square'],['black','amber','rectangular']
 ]){
  const saved=readWardrobe({version:1,styles:{eyewear:'glasses-standard'},
   d2Accessories:{eyeFrame:color,eyeTint:tint,eyeMode:mode}});
  updateWardrobeHeadLayers(layers,'bare','face-none','glasses-standard','comms-none',
   undefined,undefined,saved.d2Accessories);
  assert.equal(layers.eyewearFrame.color.getHex(),D2_FRAME_COLORS[color].hex);
  assert.equal(layers.eyewearLens.opacity,D2_LENS_MATERIALS[tint].opacity);
  assert.deepEqual(glasses.children.filter(x=>x.visible).map(x=>x.userData.d2EyeVariant),[mode]);
 }
 for(const [headwear,position,expected] of [
  ['bare','raised','forehead'],['ach','raised','helmet'],['ach','eyes','eyes'],['bare','neck','neck']
 ]){
  updateWardrobeHeadLayers(layers,headwear,'face-none','goggles-field','comms-none',
   undefined,undefined,{eyePosition:position});
  assert.deepEqual(goggles.children.filter(x=>x.visible)
   .map(x=>x.userData.d2GogglePlacement),[expected]);
 }
 assert.deepEqual(glasses.children.map(x=>meshes(x).map(m=>m.geometry)),initialGlass);
 assert.deepEqual(goggles.children.map(x=>meshes(x).map(m=>m.geometry)),initialGoggles);
});
