import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PixelTextureLibrary,PIXEL_VARIANTS,mapBoxPixelUV,mapPlanePixelUV}
 from '../src/rendering/pixel-materials.ts';
test('texture resources are reused and variant count is bounded',()=>{
 const lib=new PixelTextureLibrary();
 assert.equal(lib.get('wood',1),lib.get('wood',1+PIXEL_VARIANTS));
 assert.notEqual(lib.get('wood',1),lib.get('tile',1));
 assert.equal(lib.count,2);
 for(let i=0;i<200;i++)lib.get('wood',i);
 assert.ok(lib.count<=PIXEL_VARIANTS+1);
 lib.dispose();assert.equal(lib.count,0);
});
test('box and plane UVs use identical world-space density',()=>{
 const box=mapBoxPixelUV(new THREE.BoxGeometry(80,20,40),80,20,40);
 const uv=box.getAttribute('uv');
 assert.equal(uv.getX(1),1); // Side face spans 40 world units
 assert.equal(uv.getX(9),2); // Top face spans 80 world units
 const a=mapPlanePixelUV(new THREE.PlaneGeometry(40,40),40,40,20,20);
 const b=mapPlanePixelUV(new THREE.PlaneGeometry(40,40),40,40,60,20);
 assert.equal(a.getAttribute('uv').getX(1),b.getAttribute('uv').getX(0));
 box.dispose();a.dispose();b.dispose();
});
