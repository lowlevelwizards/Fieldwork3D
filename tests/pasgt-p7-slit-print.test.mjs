import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PASGT_SLIT_ANCHORS,pasgtSlitAtlasUv,PASGT_ATLAS_WIDTH,
 PASGT_ATLAS_HEIGHT} from '../src/operator-pasgt-drape-geometry.ts';
import {pasgtCoverTexture} from '../src/operator-pasgt-cover-texture.ts';
import {createPasgtFieldDress,updatePasgtSlitShading}
 from '../src/operator-pasgt-field-dress.ts';
test('twelve slit centers sample opaque pixels in all three cover palettes',()=>{
 for(const print of [undefined,'m81-woodland','three-color-desert']){
  const tex=pasgtCoverTexture(print,'p7-slits');
  for(const a of PASGT_SLIT_ANCHORS){
   const [u,v]=pasgtSlitAtlasUv(a);
   assert.ok(u>0&&u<1&&v>0&&v<1,a.id);
   const x=Math.round(u*PASGT_ATLAS_WIDTH-.5),
    y=Math.round(v*PASGT_ATLAS_HEIGHT-.5);
   assert.equal(tex.image.data[(y*PASGT_ATLAS_WIDTH+x)*4+3],255,a.id);
  }
 }
});
test('printed dark slit marks retain same geometry and remain fully opaque',()=>{
 const v=createPasgtFieldDress(new THREE.Group()),mesh=v.slits.children[0];
 const n=mesh.geometry.getAttribute('position').count;
 assert.equal(n,72);
 updatePasgtSlitShading(v,pasgtCoverTexture(undefined,'p7-sample'));
 const initial=Array.from(mesh.geometry.getAttribute('color').array);
 assert.ok(initial.every(c=>c>0&&c<.5),'shade should be subtle');
 updatePasgtSlitShading(v,pasgtCoverTexture('m81-woodland','p7-sample'));
 const printed=Array.from(mesh.geometry.getAttribute('color').array);
 assert.notDeepEqual(initial,printed);
 assert.equal(mesh.geometry.getAttribute('position').count,n);
 assert.equal(mesh.material.transparent,false);
});
