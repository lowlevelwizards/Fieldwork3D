import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PixelTextureLibrary,mapBoxPixelUV,mapPlanePixelUV}
 from '../src/rendering/pixel-materials.ts';
import {surfaceVisualRole,MATERIAL_RESPONSES}
 from '../src/rendering/material-identity.ts';
import {PIXEL_SURFACES,MATERIAL_RECIPE_VERSION}
 from '../src/rendering/pixel-recipes.ts';
import {ageMaterialColor}
 from '../src/rendering/condition-materials.ts';

test('F3.4 material previews share cached authored textures and complete mip chains',()=>{
 const library=new PixelTextureLibrary();
 for(const kind of PIXEL_SURFACES){
  const one=library.get(kind,0);
  assert.equal(one,library.get(kind,0),kind);
  assert.equal(one.image.width,32);
  assert.equal(one.image.height,32);
  assert.equal(one.colorSpace,THREE.SRGBColorSpace);
  assert.equal(one.magFilter,THREE.NearestFilter);
  assert.equal(one.minFilter,THREE.NearestMipmapLinearFilter);
  assert.deepEqual(one.mipmaps.map(m=>m.width),[32,16,8,4,2,1]);
  assert.ok(MATERIAL_RESPONSES[surfaceVisualRole(kind)],kind);
 }
 assert.equal(library.count,PIXEL_SURFACES.length);
 library.dispose();
 assert.equal(library.count,0);
});
test('F3.4 UVs and finish policies are deterministic without new actors',()=>{
 assert.ok(MATERIAL_RECIPE_VERSION>=5);
 const a=mapBoxPixelUV(new THREE.BoxGeometry(8,8,8),8,8,8);
 const b=mapBoxPixelUV(new THREE.BoxGeometry(8,8,8),8,8,8);
 assert.deepEqual(Array.from(a.getAttribute('uv').array),Array.from(b.getAttribute('uv').array));
 const x=mapPlanePixelUV(new THREE.PlaneGeometry(32,32),32,32,16,16);
 assert.ok(Array.from(x.getAttribute('uv').array).every(Number.isFinite));
 for(const surface of PIXEL_SURFACES){
  assert.equal(ageMaterialColor(0x888888,surface,75,.3),
   ageMaterialColor(0x888888,surface,75,.3),surface);
 }
 a.dispose();b.dispose();x.dispose();
});
