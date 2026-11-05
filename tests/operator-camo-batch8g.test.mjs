import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,
 headwearCamoIndices,headwearCamoCoverage,headwearCamoPixels,
 headwearCamoPlacement,headwearCamoSize} from '../src/operator-headwear-camo.ts';
import {FABRIC_CAMO_DENSITY,fabricCamoWorldPeriod,
 wardrobeFabricCamoTexture} from '../src/operator-fabric-camo-materials.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
const SHA_FROZEN_JGSDF='05c026d4979bd4941a94e9f3415d16ca59e9fd706c42dbdb828ac0071d8871e7';
const SHA_FROZEN_S2000='4cd092f87a82a262c5ed78d5436f5e5725ab0a0cac8dc832adebd1f991505bb9';
const SHA_8F_M98='7f80d64f6e1b4096546f7e1343d574f041622e4794e965dcaa2ef720df25d997';
const digest=id=>createHash('sha256').update(headwearCamoPixels(id)).digest('hex');
function cropStats(tile,w,h){
 let max=0,average=0,above80=0,above90=0;
 for(let sy=0;sy<64;sy++)for(let sx=0;sx<64;sx++){
  const counts=[0,0,0];
  for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)
   counts[tile[(((sy+dy)&63)*64)+((sx+dx)&63)]]++;
  const dominant=Math.max(...counts)/(w*h);
  max=Math.max(max,dominant);
  average+=dominant;
  if(dominant>.8)above80++;
  if(dominant>.9)above90++;
 }
 return {max,average:average/4096,over80:above80/4096,over90:above90/4096};
}
function boundaries(tile){
 let edges=0;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const v=tile[y*64+x];
  if(v!==tile[y*64+((x+1)&63)])edges++;
  if(v!==tile[((y+1)&63)*64+x])edges++;
 }
 return edges;
}
test('8G M98: medium organic lobes break every small cloth cut without pixel snow',()=>{
 const id='norwegian-m98',tile=headwearCamoIndices(id);
 const coverage=headwearCamoCoverage(id);
 assert.equal(tile.length,4096);
 assert.equal(headwearCamoSize(id),64);
 assert.deepEqual([...new Set(tile)].sort(),[0,1,2]);
 assert.equal(HEADWEAR_CAMO_RECIPES[id].colors.length,3);
 for(const part of coverage)assert.ok(part>.27&&part<.40,'three inks retain balanced area');
 const stats=cropStats(tile,12,18),edgeCount=boundaries(tile);
 console.log('8G M98 crop stats',JSON.stringify({stats,coverage,edgeCount}));
 assert.ok(stats.max<.86,'worst 12x18 panel should stay below 86% solid');
 assert.ok(stats.over90===0,'no 12x18 near-solid panels across 4096 cut phases');
 assert.ok(stats.over80<.015,'less than 1.5% of crop locations exceed 80% one color');
 assert.ok(edgeCount>1150&&edgeCount<1450,'rounded medium forms: neither giant blobs nor dense speckle');
 assert.notEqual(digest(id),SHA_8F_M98,'rebuild must actually replace the master');
});
test('8G M98: 2.55/3.0/3.4 are comparable; 3.0 remains selected',()=>{
 assert.equal(FABRIC_CAMO_DENSITY['norwegian-m98'],3.0);
 const candidates=[2.55,3.0,3.4].map(n=>64/n);
 assert.ok(candidates[0]>candidates[1]&&candidates[1]>candidates[2]);
 assert.ok(Math.abs(fabricCamoWorldPeriod('norwegian-m98')-candidates[1])<.0001);
 assert.equal(FABRIC_CAMO_DENSITY['jgsdf-type2'],3.2);
 assert.equal(FABRIC_CAMO_DENSITY['south-african-s2000'],2.8);
});
test('8G freezes the exact approved JGSDF and Soldier 2000 RGBA pixels',()=>{
 assert.equal(digest('jgsdf-type2'),SHA_FROZEN_JGSDF);
 assert.equal(digest('south-african-s2000'),SHA_FROZEN_S2000);
 assert.deepEqual(HEADWEAR_CAMO_RECIPES['jgsdf-type2'].colors[2],[127,96,84]);
 assert.deepEqual(HEADWEAR_CAMO_RECIPES['south-african-s2000'].colors[3],[167,184,159]);
});
test('8G retains 54 IDs, save semantics and stable original nearest-neighbor textile pixels',()=>{
 assert.equal(HEADWEAR_CAMO_IDS.length,54);
 assert.equal(new Set(HEADWEAR_CAMO_IDS).size,54);
 const id='norwegian-m98';
 assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:id}).headwearCamo,id);
 assert.equal(readWardrobe({...initialWardrobe(),fabricCamo:{trousers:id}}).fabricCamo.trousers,id);
 for(const seed of [0,5,17,73,401]){
  const cut=headwearCamoPlacement('rook','trousers',id,seed);
  assert.deepEqual(cut,headwearCamoPlacement('rook','trousers',id,seed));
  const tex=wardrobeFabricCamoTexture(id,'trousers',cut);
  assert.deepEqual(tex.image.data,headwearCamoPixels(id));
  assert.equal(tex.image.width,64);
  assert.equal(tex.magFilter,THREE.NearestFilter);
  assert.equal(tex.colorSpace,THREE.SRGBColorSpace);
  assert.equal(tex.repeat.x,32*FABRIC_CAMO_DENSITY[id]/64);
  assert.equal(tex.repeat.y,tex.repeat.x);
 }
 assert.deepEqual(headwearCamoIndices('pencott-metropolis'),
  headwearCamoIndices('pencott-greenzone'));
 assert.deepEqual(headwearCamoIndices('kryptek-typhon'),
  headwearCamoIndices('kryptek-highlander'));
});
