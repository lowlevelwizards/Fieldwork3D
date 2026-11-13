import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';
import {consolidateVisualGroup} from '../src/operator-visual-mesh-merge.ts';
import {createAchMichDrapedGeometry} from '../src/operator-ach-mich-cover-drape.ts';

test('H8 cosmetic mesh merge preserves shadow policy',()=>{
 const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:0x526341});
 for(const x of [-1,1]){
  const item=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),m);
  item.position.x=x;item.castShadow=false;item.receiveShadow=false;g.add(item);
 }
 consolidateVisualGroup(g);
 assert.equal(g.children.length,1);
 assert.equal(g.children[0].castShadow,false);
 assert.equal(g.children[0].receiveShadow,false);
});

test('H8 approved PASGT detail geometry is reused for ACH/MICH foliage and scrim',()=>{
 for(const id of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),id);
  assert.equal(kit.modules.leaves.children.length,10);
  assert.ok(kit.modules.leaves.children.every(c=>c.name==='pasgt-derived-foliage'));
  assert.ok(kit.modules.scrim.children.some(c=>c.name==='pasgt-derived-folded-scrim'));
  assert.ok(kit.modules.band.children.some(c=>c.name==='shell-fitted-elastic'));
  assert.ok(kit.modules['goggles-front'].children.some(c=>c.name==='approved-d2-goggle-pose'));
  assert.ok(kit.modules.unfastened.children.some(c=>c.name==='released-four-point-strap'));
 }
});

test('H8 band and chin webbing are independently recolored without reallocation',()=>{
 const kit=createHelmetFieldLayers(new THREE.Group(),'ach');
 const ref=kit.modules.band.children[0];
 updateHelmetFieldLayers(kit,{band:true,bandColor:'tan',
  webbingColor:'black',fastened:false},0x6b7264,true);
 assert.equal(kit.bandMaterial.color.getHex(),0x977e59);
 assert.equal(kit.webbingMaterial.color.getHex(),0x262a29);
 assert.equal(kit.modules.unfastened.visible,true);
 updateHelmetFieldLayers(kit,{band:true,bandColor:'match',
  webbingColor:'olive',fastened:true},0xa18f70,true);
 assert.equal(kit.bandMaterial.color.getHex(),0xa18f70);
 assert.equal(kit.webbingMaterial.color.getHex(),0x586548);
 assert.equal(kit.modules.band.children[0],ref);
 assert.equal(kit.modules.unfastened.visible,false);
});

test('H8 ACH/MICH fitted drapes remain nonempty from top to hem',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const mesh=createAchMichDrapedGeometry(shell);
  const hem=createAchMichDrapedGeometry(shell,true);
  assert.ok(mesh.getAttribute('position').count>120);
  assert.ok(hem.getAttribute('position').count>12);
  assert.equal(mesh.getAttribute('position').count,mesh.getAttribute('normal').count);
  mesh.dispose();hem.dispose();
 }
});
