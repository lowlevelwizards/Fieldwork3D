import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeadwearSilhouette,headwearCuboidVolumes}
 from '../src/operator-headwear-silhouettes.ts';
import {createHeadwearDetailMaterial,headwearDetailPixels,
 headwearFaceTone,headwearFaceRegion,headwearRegionPixel,HEADWEAR_ATLAS_PIXELS,
 HEADWEAR_DETAIL_PIXEL_WORLD_SIZE}
 from '../src/operator-headwear-materials.ts';
import {TILE_PIXELS,PIXEL_WORLD_SIZE}
 from '../src/rendering/pixel-recipes.ts';

const ids=['patrol-cap','boonie','beanie','ach','high-cut','pasgt','soviet-steel'];
test('all approved headwear stays one unioned, UV mapped exterior mesh',()=>{
 for(const id of ids){
  const g=createHeadwearSilhouette(id,createHeadwearDetailMaterial(id));
  assert.equal(g.children.length,1,id);
  const geo=g.children[0].geometry;
  assert.equal(geo.userData.greedyCuboidUnion,true,id);
  assert.equal(geo.userData.materialRegions,true,id);
  assert.equal(geo.userData.cuboids.length,headwearCuboidVolumes(id).length,id);
  assert.equal(geo.getAttribute('uv').count,geo.getAttribute('position').count,id);
  assert.equal(geo.getAttribute('color').count,geo.getAttribute('position').count,id);
  assert.equal(geo.userData.pixelWorldSize,1,id);
  assert.equal(geo.userData.materialAtlasPixels,64,id);
  assert.ok(geo.userData.exteriorQuads<300,id+' no detail-surface explosion');
  const uv=geo.getAttribute('uv'),color=geo.getAttribute('color');
  for(let i=0;i<uv.count;i++){
   assert.ok(Number.isFinite(uv.getX(i))&&Number.isFinite(uv.getY(i)));
   assert.ok(color.getX(i)>=.72&&color.getX(i)<=1);
   assert.equal(color.getX(i),color.getY(i));
  }
 }
});
test('headwear texture scale and grayscale-only pixels match operator materials',()=>{
 assert.equal(HEADWEAR_DETAIL_PIXEL_WORLD_SIZE,PIXEL_WORLD_SIZE);
 for(const kind of ['cotton','knit','composite','steel']){
  const pixels=headwearDetailPixels(kind);
  assert.equal(pixels.length,HEADWEAR_ATLAS_PIXELS**2*4);
  let dark=0;
  for(let i=0;i<pixels.length;i+=4){
   assert.equal(pixels[i],pixels[i+1]);
   assert.equal(pixels[i+1],pixels[i+2]);
   assert.equal(pixels[i+3],255);
   if(pixels[i]<236)dark++;
  }
  assert.ok(dark/(pixels.length/4)>.01,kind+' must be visibly developed');
  assert.ok(dark/(pixels.length/4)<.90,kind+' must retain flat negative space');
 }
});
test('big material hierarchy is explicit; no fake micro seams on helmets',()=>{
 assert.ok(headwearFaceTone('beanie','beanie-front-cuff',2,-1)<
  headwearFaceTone('beanie','beanie-fitted-crown',2,-1));
 assert.ok(headwearFaceTone('boonie','boonie-front-band',2,-1)<
  headwearFaceTone('boonie','boonie-front-crown',2,-1));
 assert.ok(headwearFaceTone('soviet-steel','ssh40-integrated-front-edge',2,-1)<
  headwearFaceTone('soviet-steel','ssh40-main-dome',1,1));
 assert.ok(headwearFaceTone('pasgt','pasgt-integrated-front-peak',2,-1)<
  headwearFaceTone('pasgt','pasgt-single-protective-crown',2,-1));
});
test('materials are neutral, reusable and nearest sampled',()=>{
 const mat=createHeadwearDetailMaterial('beanie');
 assert.equal(mat.vertexColors,true);
 assert.equal(mat.map.magFilter,THREE.NearestFilter);
 assert.equal(mat.map.colorSpace,THREE.SRGBColorSpace);
 assert.equal(mat.map,createHeadwearDetailMaterial('beanie').map);
});

test('Stage 2B physical pixel scale is identical across operator and environment',()=>{
 assert.equal(PIXEL_WORLD_SIZE,1);
 assert.equal(HEADWEAR_DETAIL_PIXEL_WORLD_SIZE,1);
 assert.equal(TILE_PIXELS,32);
});
test('Stage 2B detail is anchored to the correct construction regions',()=>{
 assert.equal(headwearFaceRegion('patrol-cap','patrol-anchored-bill',1,1),2);
 assert.equal(headwearFaceRegion('patrol-cap','patrol-anchored-bill',1,-1),1);
 assert.equal(headwearFaceRegion('boonie','boonie-left-brim',1,1),2);
 assert.equal(headwearFaceRegion('beanie','beanie-front-cuff',2,-1),1);
 assert.equal(headwearFaceRegion('beanie','beanie-fitted-crown',1,1),3);
 assert.equal(headwearFaceRegion('soviet-steel','ssh40-integrated-front-edge',2,-1),2);
});
test('Stage 2B patterns are individualized and substantially legible',()=>{
 const equal=(a,b)=>Buffer.from(a).equals(Buffer.from(b));
 assert.equal(equal(headwearDetailPixels('patrol-cap'),headwearDetailPixels('boonie')),false);
 assert.equal(equal(headwearDetailPixels('ach'),headwearDetailPixels('pasgt')),false);
 assert.equal(equal(headwearDetailPixels('beanie'),headwearDetailPixels('patrol-cap')),false);
 const tex=createHeadwearDetailMaterial('boonie').map;
 assert.equal(tex.image.width,64);
 assert.equal(tex.image.height,64);
 assert.equal(tex.wrapS,THREE.ClampToEdgeWrapping);
 assert.equal(tex.magFilter,THREE.NearestFilter);
});

test('2B.1: crown tops are quiet instead of containing arbitrary dark blocks',()=>{
 for(const id of ids){
  const values=new Set();
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)values.add(headwearRegionPixel(id,3,x,y));
  assert.ok(values.size<=2,id+' top must be clean');
 }
 for(const id of ['beanie','ach','high-cut','pasgt','soviet-steel']){
  assert.equal(headwearRegionPixel(id,3,10,10),headwearRegionPixel(id,3,20,20),id);
 }
});
test('2B.1: marks must explain construction, not random rectangles',()=>{
 // One patrol seam on the vertical crown and a bill-edge run.
 assert.ok(headwearRegionPixel('patrol-cap',0,16,23)<
  headwearRegionPixel('patrol-cap',0,19,23));
 assert.ok(headwearRegionPixel('patrol-cap',2,16,10)<
  headwearRegionPixel('patrol-cap',2,16,13));
 // A single boonie stitch ring at a real distance from brim perimeter.
 assert.ok(headwearRegionPixel('boonie',2,21,16)<
  headwearRegionPixel('boonie',2,19,16));
 // Ribbed cuff is higher contrast than the soft crown; roof is plain.
 assert.ok(headwearRegionPixel('beanie',1,16,17)<
  headwearRegionPixel('beanie',0,16,17));
 // No helmet has three unmotivated dark spots on the crown.
 for(const id of ['ach','high-cut','pasgt','soviet-steel']){
  assert.equal(headwearRegionPixel(id,0,12,15),
   headwearRegionPixel(id,0,20,24),id);
 }
});
test('2B.1: physical top/underside mapping is intentional',()=>{
 assert.equal(headwearFaceRegion('patrol-cap','patrol-integrated-crown',1,1),3);
 assert.equal(headwearFaceRegion('boonie','boonie-integrated-crown',1,1),3);
 assert.equal(headwearFaceRegion('boonie','boonie-front-brim',1,-1),1);
 for(const id of ['ach','high-cut','pasgt','soviet-steel']){
  assert.equal(headwearFaceRegion(id,id+'-continuous-crown',1,1),3,id);
 }
 assert.equal(headwearFaceRegion('soviet-steel','ssh40-integrated-front-edge',2,-1),2);
});
