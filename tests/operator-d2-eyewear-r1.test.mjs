/** Regression contracts from R1, updated for the intentionally sparse R3 rebuild. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';
import {createD2Goggles} from '../src/operator-d2-goggle-visuals.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers} from '../src/operator-wardrobe-head-visuals.ts';
import {D2_FRAME_COLORS,D2_LENS_MATERIALS} from '../src/operator-head-accessory-catalog.ts';
import {readWardrobe} from '../src/operator-wardrobe-data.ts';
const material=new THREE.MeshStandardMaterial({color:0x626b60});
const meshes=g=>{const result=[];g.traverse(o=>{if(o.isMesh)result.push(o)});return result;};
test('R1 preserved: same seven IDs and variant/pose options after full R3 geometry rewrite',()=>{
 const ids=['glasses-standard','glasses-aviator','glasses-wrap','glasses-shield'];
 const glasses=ids.map(id=>createD2Glasses(id,material,material));
 assert.deepEqual(glasses[0].children.map(g=>g.userData.d2EyeVariant),
  ['rectangular','round','heavy-square']);
 for(const g of glasses)assert.equal(g.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
 for(const id of ['goggles-low','goggles-field','goggles-retro']){
  const g=createD2Goggles(id,material,material,material);
  assert.deepEqual(g.children.map(x=>x.userData.d2GogglePlacement),
   ['eyes','forehead','helmet','neck']);
 }
});
test('R1 preserved: frame, tint and goggle position selections update without reallocating meshes',()=>{
 const root=new THREE.Group(),head=new THREE.Group();root.add(head);
 const l=createWardrobeHeadLayers(root,head,material,material,material,material);
 const standards=l.eyewear['glasses-standard'].children.find(g=>g.userData.modelAxes);
 const googles=l.eyewear['goggles-field'].children.find(g=>g.userData.modelAxes);
 const initial=[...meshes(standards),...meshes(googles)].map(m=>m.geometry);
 for(const [color,tint,variant] of [
  ['tan','smoke','round'],['olive','clear','heavy-square'],['black','amber','rectangular']
 ]){
  const save=readWardrobe({version:1,styles:{eyewear:'glasses-standard'},
   d2Accessories:{eyeFrame:color,eyeTint:tint,eyeMode:variant}});
  updateWardrobeHeadLayers(l,'bare','face-none','glasses-standard','comms-none',
   undefined,undefined,save.d2Accessories);
  assert.equal(l.eyewearFrame.color.getHex(),D2_FRAME_COLORS[color].hex);
  assert.equal(l.eyewearLens.opacity,D2_LENS_MATERIALS[tint].opacity);
  assert.deepEqual(standards.children.filter(g=>g.visible)
   .map(g=>g.userData.d2EyeVariant),[variant]);
 }
 for(const [headwear,pose,expected] of [
  ['bare','raised','forehead'],['ach','raised','helmet'],
  ['ach','eyes','eyes'],['bare','neck','neck']
 ]){
  updateWardrobeHeadLayers(l,headwear,'face-none','goggles-field','comms-none',
   undefined,undefined,{eyePosition:pose});
  assert.deepEqual(googles.children.filter(g=>g.visible)
   .map(g=>g.userData.d2GogglePlacement),[expected]);
 }
 assert.deepEqual([...meshes(standards),...meshes(googles)].map(m=>m.geometry),initial);
});
