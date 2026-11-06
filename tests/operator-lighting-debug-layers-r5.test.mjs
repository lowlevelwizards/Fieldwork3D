import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {previewOperatorLightingLayers,restoreOperatorLightingPreview,
 DEFAULT_LIGHTING_LAYERS}
 from '../src/operator-lighting-inspector.ts';
const demo=()=>{
 const root=new THREE.Group(),g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute([
  0,5,0, 0,12,0, 0,35,0, 0,50,0
 ],3));
 g.setAttribute('color',new THREE.Uint8BufferAttribute(
  new Uint8Array([120,120,120,140,140,140,170,170,170,210,210,210]),3,true));
 g.setAttribute('uv',new THREE.Float32BufferAttribute([
  0,0,1,0,0,1,1,1
 ],2));
 g.userData.fieldworkSelfOcclusionMask=new Uint8Array([100,0,0,0]);
 g.userData.fieldworkExternalOcclusionMask=new Uint8Array([30,0,0,0]);
 g.userData.fieldworkInterContactMask=new Uint8Array([0,80,0,0]);
 g.userData.fieldworkDirectionalCastMask=new Uint8Array([0,0,50,0]);
 const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true}));
 root.add(mesh);
 return {root,g,mesh};
};
test('R5.6-D disabling independent masks brightens only their receivers',()=>{
 const {root,g,mesh}=demo();
 const byte=()=>Array.from(g.getAttribute('color').array);
 const original=byte(),uv=Array.from(g.getAttribute('uv').array);
 const mode={...DEFAULT_LIGHTING_LAYERS,self:false};
 assert.equal(previewOperatorLightingLayers(root,mode),1);
 const changed=byte();
 assert.ok(changed[0]>original[0]);
 assert.equal(changed[3],original[3]);
 assert.equal(changed[6],original[6]);
 assert.equal(previewOperatorLightingLayers(root,mode),1);
 assert.deepEqual(byte(),changed,'no accumulation on repeated toggles');
 assert.equal(restoreOperatorLightingPreview(root),1);
 assert.deepEqual(byte(),original);
 assert.deepEqual(Array.from(g.getAttribute('uv').array),uv);
 g.dispose();mesh.material.dispose();
});
test('R5.6-D height preview and restoration are independent',()=>{
 const {root,g,mesh}=demo();
 const original=Array.from(g.getAttribute('color').array);
 const mode={...DEFAULT_LIGHTING_LAYERS,height:false};
 previewOperatorLightingLayers(root,mode);
 const newColors=Array.from(g.getAttribute('color').array);
 assert.ok(newColors[0]>original[0]);
 assert.equal(newColors[9],original[9],'head remains at 100 percent');
 previewOperatorLightingLayers(root,{...DEFAULT_LIGHTING_LAYERS});
 assert.deepEqual(Array.from(g.getAttribute('color').array),original);
 g.dispose();mesh.material.dispose();
});
