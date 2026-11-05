/** R2.1 compatibility gates, intentionally superseded by R3's
 * self-contained lens materials and no fake generic facet overlays.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';
import {createD2Goggles} from '../src/operator-d2-goggle-visuals.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers} from '../src/operator-wardrobe-head-visuals.ts';
import {D2_LENS_MATERIALS} from '../src/operator-head-accessory-catalog.ts';
const frame=new THREE.MeshStandardMaterial({color:0x343838});
const lens=new THREE.MeshStandardMaterial({color:0xc1c6c7,transparent:true,opacity:.3});
const elastic=new THREE.MeshStandardMaterial({color:0x393a32});
const meshes=g=>{const r=[];g.traverse(x=>{if(x.isMesh)r.push(x)});return r;};
test('R2.1 migration: no fake lens glints, true tintable pane for all seven model families',()=>{
 for(const id of ['glasses-standard','glasses-aviator','glasses-wrap','glasses-shield']){
  const g=createD2Glasses(id,frame,lens);
  const active=id==='glasses-standard'?g.children[0]:g;
  assert.ok(meshes(active).some(x=>x.name.endsWith('-lens')));
  assert.ok(!meshes(active).some(x=>x.name.endsWith('-lens-facet')));
 }
 for(const id of ['goggles-low','goggles-field','goggles-retro']){
  const g=createD2Goggles(id,frame,lens,elastic);
  assert.ok(meshes(g.children[0]).some(x=>x.name.endsWith('-lens')));
  assert.ok(!meshes(g).some(x=>x.name.endsWith('-lens-facet')));
 }
});
test('R2.1 migration: clear and tinted lens colors still change in place',()=>{
 const m=new THREE.MeshStandardMaterial({color:0x777777});
 const root=new THREE.Group(),head=new THREE.Group();root.add(head);
 const layers=createWardrobeHeadLayers(root,head,m,m,m,m);
 const chosen=layers.eyewear['glasses-shield'].children.find(x=>x.userData.modelAxes);
 const initial=meshes(chosen).map(x=>x.geometry);
 for(const tint of ['clear','smoke','amber','dark-smoke','mirrored','clear']){
  updateWardrobeHeadLayers(layers,'ach','face-none','glasses-shield','comms-none',
   undefined,undefined,{eyeTint:tint,eyeFrame:'olive'});
  assert.equal(layers.eyewearLens.color.getHex(),D2_LENS_MATERIALS[tint].hex);
  assert.equal(layers.eyewearLens.opacity,D2_LENS_MATERIALS[tint].opacity);
  assert.equal(layers.eyewearLens.metalness,tint==='mirrored'?.48:.04);
 }
 assert.deepEqual(meshes(chosen).map(x=>x.geometry),initial);
});
