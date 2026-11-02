import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeadwearSilhouette,headwearCuboidVolumes}
 from '../src/operator-headwear-silhouettes.ts';
import {createHeadwearDetailMaterial,headwearDetailPixels,
 headwearFaceTone,HEADWEAR_DETAIL_PIXEL_WORLD_SIZE}
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
  assert.equal(geo.userData.pixelWorldSize,1.25,id);
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
  assert.equal(pixels.length,TILE_PIXELS*TILE_PIXELS*4);
  let dark=0;
  for(let i=0;i<pixels.length;i+=4){
   assert.equal(pixels[i],pixels[i+1]);
   assert.equal(pixels[i+1],pixels[i+2]);
   assert.equal(pixels[i+3],255);
   if(pixels[i]<255)dark++;
  }
  assert.ok(dark/(pixels.length/4)<.16,kind+' must stay quiet');
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
