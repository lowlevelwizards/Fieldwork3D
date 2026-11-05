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

test('R1 eyewear uses bold frame thickness, broad lens shapes and real side temples',()=>{
 for(const id of ['glasses-standard','glasses-aviator','glasses-wrap','glasses-shield']){
  const model=createD2Glasses(id,frame,lens);
  const variant=id==='glasses-standard'?model.children[0]:model;
  const visible=meshes(variant);
  assert.ok(visible.some(x=>x.name.endsWith('-lens')));
  const rims=visible.filter(x=>x.name.endsWith('-rim'));
  assert.ok(rims.length>=4,id);
  for(const rim of rims){
   assert.ok(rim.geometry.parameters?.height>=.40,id+' rim needs chunky minimum thickness');
   assert.ok(rim.geometry.parameters?.depth>=.40,id+' frame must project off face');
  }
  const size=boxSize(variant);
  assert.ok(size.x>7.5,id+' must read boldly across 8-unit head');
  assert.ok(size.y>1.9,id+' needs legible eye height');
  assert.ok(size.z>7.1,id+' must have substantive side arms');
 }
 const standard=createD2Glasses('glasses-standard',frame,lens);
 assert.deepEqual(standard.children.map(x=>x.userData.d2EyeVariant),
  ['rectangular','round','heavy-square']);
 for(const variant of standard.children)
  assert.ok(boxSize(variant).x>7.5);
 const shield=createD2Glasses('glasses-shield',frame,lens);
 assert.equal(meshes(shield).filter(x=>x.name.endsWith('-lens')).length,1);
 assert.equal(meshes(createD2Glasses('glasses-wrap',frame,lens))
  .filter(x=>x.name.endsWith('-lens')).length,2);
});

test('R1 protective families have distinct one-piece low/deep and paired vintage lens silhouettes',()=>{
 const models=['goggles-low','goggles-field','goggles-retro']
  .map(id=>createD2Goggles(id,frame,lens,elastic));
 for(const model of models){
  assert.deepEqual(model.children.map(x=>x.userData.d2GogglePlacement),
   ['eyes','forehead','helmet','neck']);
  const eyes=model.children[0],rims=meshes(eyes).filter(x=>x.name.endsWith('-rim'));
  assert.ok(rims.length>=8);
  assert.ok(rims.every(x=>x.geometry.parameters?.height>=.48),
   model.name+' needs consistently thick rim bars');
  assert.ok(boxSize(eyes).x>8.2,model.name);
  assert.ok(meshes(eyes).some(x=>x.name==='strap-back'));
 }
 const [low,field,retro]=models.map(x=>x.children[0]);
 const lensCount=g=>meshes(g).filter(x=>x.name.endsWith('-lens')).length;
 assert.deepEqual([lensCount(low),lensCount(field),lensCount(retro)],[1,1,2]);
 assert.ok(boxSize(field).z>boxSize(low).z+.30,
  'field goggles should have a deeper dust housing than low-profile');
 assert.ok(meshes(retro).some(x=>x.name==='bold-cup-bridge'));
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
